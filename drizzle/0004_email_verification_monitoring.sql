ALTER TABLE users ADD COLUMN email_verified_at text;
UPDATE users SET email_verified_at=CURRENT_TIMESTAMP WHERE lower(email)='alisson@highparts.com.br';

CREATE TABLE email_verification_tokens (
  token_hash text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES users(id),
  expires_at text NOT NULL,
  used_at text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX email_verification_user_idx ON email_verification_tokens(user_id);

CREATE TABLE security_events (
  id text PRIMARY KEY NOT NULL,
  type text NOT NULL,
  user_id text,
  subject_hash text,
  details text NOT NULL DEFAULT '{}',
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX security_events_created_idx ON security_events(created_at);
CREATE INDEX security_events_type_idx ON security_events(type);
