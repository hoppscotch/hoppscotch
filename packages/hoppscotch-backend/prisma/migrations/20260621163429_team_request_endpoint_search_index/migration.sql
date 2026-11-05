-- Create GIN Trigram Index for TeamRequest endpoint (extracted from request JSON)
CREATE INDEX
  "TeamRequest_endpoint_trgm_idx"
ON
  "TeamRequest"
USING
  GIN ((request->>'endpoint') gin_trgm_ops);
