-- Extend sync_mock_examples() to project the GraphQL operation identity of
-- saved example responses (operationName / operationType, stamped by the app
-- when a GraphQL run is saved as an example). The mock server's GraphQL
-- matcher selects examples by these, the way REST examples match by
-- method + path. REST examples project both fields as NULL.
CREATE OR REPLACE FUNCTION sync_mock_examples()
RETURNS TRIGGER AS $$
BEGIN
  NEW."mockExamples" := jsonb_build_object(
    'examples',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'key', key,
            'name', value->>'name',
            'endpoint', value->'originalRequest'->>'endpoint',
            'method', value->'originalRequest'->>'method',
            'headers', COALESCE(value->'originalRequest'->'headers', '[]'::jsonb),
            'statusCode', (value->>'code')::int,
            'statusText', value->>'status',
            'responseBody', value->>'body',
            'responseHeaders', COALESCE(value->'headers', '[]'::jsonb),
            'operationName', value->>'operationName',
            'operationType', value->>'operationType'
          )
        )
        FROM jsonb_each(NEW.request->'responses') AS responses(key, value)
        WHERE jsonb_typeof(NEW.request->'responses') = 'object'
      ),
      '[]'::jsonb
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill: re-fire the trigger so existing rows pick up the new projection
UPDATE "UserRequest" SET request = request WHERE request IS NOT NULL;
UPDATE "TeamRequest" SET request = request WHERE request IS NOT NULL;
