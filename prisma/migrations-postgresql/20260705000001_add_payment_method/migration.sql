-- Migration PostgreSQL : ajout colonne paymentMethod sur event_registrations
-- Story 25-4: inscription/paiement events
ALTER TABLE "event_registrations" ADD COLUMN "paymentMethod" TEXT;