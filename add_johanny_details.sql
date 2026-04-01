INSERT INTO emma_network (user_id, instagram, tiktok, whatsapp, city, notes, metadata)
VALUES (
  (SELECT id FROM users WHERE username = 'johanny' LIMIT 1),
  'johanny_dr',
  'johanny_baseball',
  '+18095551234',
  'Puerto Plata',
  'Baseball player from Dominican Republic living in Puerto Plata and is main recruit for that area also.',
  '{"recruiter": true, "vertical": "VAULTX_ADULT_PREMIUM", "secondary_vertical": "LONGFORM_DEMOS_TOURS"}'
);

INSERT INTO brand_affiliations (user_id, brand_id, is_primary)
VALUES (
  (SELECT id FROM users WHERE username = 'johanny' LIMIT 1),
  'CREATORVAULTDOMINICANA',
  1
);

INSERT INTO brand_affiliations (user_id, brand_id, is_primary)
VALUES (
  (SELECT id FROM users WHERE username = 'johanny' LIMIT 1),
  'VAULTX',
  0
);
