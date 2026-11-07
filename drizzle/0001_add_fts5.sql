-- FTS5 virtual table for evidence full-text search
CREATE VIRTUAL TABLE evidence_fts USING fts5(
  title,
  content,
  evidence_type,
  content='evidence',
  content_rowid='rowid'
);

-- Triggers to keep FTS5 in sync with evidence table
CREATE TRIGGER evidence_ai AFTER INSERT ON evidence BEGIN
  INSERT INTO evidence_fts(rowid, title, content, evidence_type) VALUES (new.rowid, new.title, new.content, new.evidence_type);
END;

CREATE TRIGGER evidence_ad AFTER DELETE ON evidence BEGIN
  INSERT INTO evidence_fts(evidence_fts, rowid, title, content, evidence_type) VALUES ('delete', old.rowid, old.title, old.content, old.evidence_type);
END;

CREATE TRIGGER evidence_au AFTER UPDATE ON evidence
WHEN old.title IS NOT new.title OR old.content IS NOT new.content OR old.evidence_type IS NOT new.evidence_type
BEGIN
  INSERT INTO evidence_fts(evidence_fts, rowid, title, content, evidence_type) VALUES ('delete', old.rowid, old.title, old.content, old.evidence_type);
  INSERT INTO evidence_fts(rowid, title, content, evidence_type) VALUES (new.rowid, new.title, new.content, new.evidence_type);
END;