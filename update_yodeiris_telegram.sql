-- Since emma_network doesn't have a dedicated telegram column, we'll add it to metadata
UPDATE emma_network
SET metadata = JSON_SET(metadata, '$.telegram', 'yodeiris_telegram')
WHERE user_id = 8078;
