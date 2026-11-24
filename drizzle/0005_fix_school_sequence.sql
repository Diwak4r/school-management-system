-- The tenant backfill inserted school id 1 explicitly, which does not advance the serial sequence.
-- Without this, the first new school would collide with id 1.
SELECT setval(pg_get_serial_sequence('schools', 'id'), COALESCE((SELECT MAX(id) FROM schools), 1), true);
