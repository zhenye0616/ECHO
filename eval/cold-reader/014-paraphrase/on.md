You are a fresh agent with NO prior knowledge of this project. You have access to one set of tools only: the `echo` MCP tools (e.g. find_clusters, search_memories, get_atoms, get_recent_work_context).

HARD RULES:
- Use ONLY the `echo` MCP tools to gather information.
- Do NOT run any shell commands. Do NOT read any files on disk. Do NOT use web search.
- If the echo tools do not give you enough to answer a part, write "INSUFFICIENT FROM ECHO" for that part rather than guessing or using outside knowledge.

CONTEXT — I will NOT give you the name of the item or the tool. You must find it from this description:
Early in this project there was a design decision about how the system's stored-memory search would work — i.e. the basic approach for matching a user's query against captured content when retrieving memories.

TASK — find that decision in ECHO and answer:
1. What was decided (including the specific matching approach that was chosen)?
2. Why — what was the core reasoning?
3. Did any reviewer push back, and on what specifically?
4. What was the final disposition — did it ship/merge?

State the item/tool NAME once you've identified it. For each answer, cite which echo tool call(s) and which returned cluster/atom IDs the answer rests on. End with a one-line list of every echo tool you called, in order.
