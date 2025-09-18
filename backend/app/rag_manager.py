# rag_manager.py
import os
from typing import Dict
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from functools import lru_cache

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
if HF_TOKEN:
    os.environ['HF_TOKEN'] = HF_TOKEN

# global in-memory store: session_id -> meta
_store: Dict[str, Dict] = {}

@lru_cache()
def get_embeddings():
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def create_vectorstore_from_pdfs(session_id: str, pdf_paths: list):
    """
    - Loads PDFs, splits to chunks, creates embeddings and a Chroma vectorstore.
    - Stores vectorstore and chat history in _store[session_id]
    """
    embeddings = get_embeddings()
    docs = []
    for p in pdf_paths:
        loader = PyPDFLoader(p)
        docs.extend(loader.load())

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=5000, chunk_overlap=500)
    splits = text_splitter.split_documents(docs)

    # persist directory per session (optional)
    persist_dir = f"./chroma_data/{session_id}"
    os.makedirs(persist_dir, exist_ok=True)

    # create Chroma vectorstore; with persist_directory it stores to disk automatically
    vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=persist_dir)

    retriever = vectorstore.as_retriever()

    # initialize empty chat history
    history = ChatMessageHistory()

    _store[session_id] = {
        "vectorstore": vectorstore,
        "retriever": retriever,
        "history": history,
    }
    return _store[session_id]

def get_session(session_id: str):
    return _store.get(session_id)

def query_rag(session_id: str, question: str, groq_api_key: str, model_name: str = "Gemma2-9b-It"):
    """
    Recreates a history-aware retriever and rag chain, then invokes RunnableWithMessageHistory
    similar to your Streamlit flow.
    """
    sess = get_session(session_id)
    if not sess:
        raise ValueError("Session not found or no documents uploaded for this session.")

    retriever = sess["retriever"]
    history = sess["history"]

    # contextualize prompt
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question"
        " which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    llm = ChatGroq(groq_api_key=groq_api_key, model_name=model_name)

    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

    system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Use three sentences maximum and keep the "
        "answer concise."
        "\n\n"
        "{context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        lambda s=session_id: history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )

    response = conversational_rag_chain.invoke(
        {"input": question},
        config={
            "configurable": {"session_id": session_id}
        },
    )
    # response is a dict with 'answer' key
    return response["answer"], history.messages
