# search_agent.py
from langchain_groq import ChatGroq
from langchain_community.utilities import ArxivAPIWrapper, WikipediaAPIWrapper
from langchain_community.tools import ArxivQueryRun, WikipediaQueryRun, DuckDuckGoSearchRun
from langchain.agents import initialize_agent, AgentType
from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# create tools (similar to your Streamlit)
arxiv_wrapper = ArxivAPIWrapper(top_k_results=1, doc_content_chars_max=200)
arxiv = ArxivQueryRun(api_wrapper=arxiv_wrapper)

wiki_api_wrapper = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=1000)
wiki = WikipediaQueryRun(api_wrapper=wiki_api_wrapper)

search = DuckDuckGoSearchRun(name="Search")

@lru_cache()
def get_search_agent(model_name: str = "llama-3.1-8b-instant"):
    llm = ChatGroq(groq_api_key=GROQ_API_KEY, model_name=model_name, streaming=False, temperature=0.1)
    tools = [search, arxiv, wiki]
    agent = initialize_agent(
        tools,
        llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        handle_parsing_errors=True,
        return_intermediate_steps=True,
        max_iterations=5,  # Limit iterations to prevent infinite loops
        early_stopping_method="generate",  # Stop early if agent generates final answer
        verbose=True,
    )
    return agent

def run_search_agent(messages):
    """
    messages: list of {"role": "...", "content": "..."} exactly like your Streamlit session_state.messages
    """
    agent = get_search_agent()
    # Agents expect a string input; send the latest user message content
    if not messages:
        return {"output": "", "steps": []}
    last_user_message = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), messages[-1].get("content", ""))
    
    try:
        result = agent.invoke({"input": last_user_message})
        # result is expected to be a dict with keys like 'output' and 'intermediate_steps' when return_intermediate_steps=True
        output_text = result.get("output") if isinstance(result, dict) else str(result)
        raw_steps = result.get("intermediate_steps", []) if isinstance(result, dict) else []

        # Convert steps to a lightweight, serializable form
        steps = []
        for step in raw_steps:
            try:
                action, observation = step
                steps.append({
                    "tool": getattr(action, "tool", None),
                    "tool_input": getattr(action, "tool_input", None),
                    "log": getattr(action, "log", None),
                    "observation": str(observation)[:2000],  # Truncate to prevent huge responses
                })
            except Exception:
                try:
                    steps.append({"raw": str(step)[:2000]})
                except Exception:
                    pass

        # If no output or empty output, provide a fallback
        if not output_text or output_text.strip() == "":
            output_text = "I apologize, but I couldn't generate a proper response. The search may have encountered an issue or the query was too complex."

        return {"output": output_text, "steps": steps}
    
    except Exception as e:
        # If agent fails completely, return error message
        return {
            "output": f"I encountered an error while processing your request: {str(e)}. Please try rephrasing your question or ask something else.",
            "steps": [{"error": str(e)}]
        }
