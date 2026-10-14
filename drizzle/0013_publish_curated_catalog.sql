UPDATE products SET active=0,updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
UPDATE products
   SET active=1,updated_at=CURRENT_TIMESTAMP
 WHERE code IN (
   'HF 01','HF 02A','HF 14','HF 23','HF 30','HF 31','HF 31B','HF 32',
   'HF 38','HF 51C','HF 549B','HF 81','HF 81C','HF 87A','HF 87B'
 );
