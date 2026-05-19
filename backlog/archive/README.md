# Backlog Archive

Items in `backlog/complete/` whose decisions have been promoted to `wiki/` are reduced to compact stubs in place. The full original spec body moves to `backlog/archive/shipped/<YYYY-MM>/<item-id>.md`.

The stub schema preserves the item ID, title, merged commit, wiki reference, and archive pointer:

```yaml
id: <item-id>
status: archived
title: <short title>
merged_sha: <merge commit sha>
wiki_ref: <wiki path>
archive_path: backlog/archive/shipped/<YYYY-MM>/<item-id>.md
```

Grep and git history still find the shipped work, while the live pipeline directory stays lean.
