-- AlterTable: new default transactionType
ALTER TABLE "Listing" ALTER COLUMN "transactionType" SET DEFAULT 'VENTE';

-- Data migration: map legacy transactionType codes to the new taxonomy
-- (VENTE | LOCATION | SEJOUR | AUBERGE)
UPDATE "Listing" SET "transactionType" = 'VENTE' WHERE "transactionType" = 'SALE';
UPDATE "Listing" SET "transactionType" = 'LOCATION' WHERE "transactionType" = 'RENT';
UPDATE "Listing" SET "transactionType" = 'SEJOUR' WHERE "transactionType" = 'SHORT_RENT';

-- Data migration: map legacy propertyType codes to the new taxonomy
-- (VILLA | APPARTEMENT | PARCELLE | DOMAINE | MAISON | BOUTIQUE | BUREAU |
--  SALLE_FETE | SALLE_CONFERENCE | IMMEUBLE)
UPDATE "Listing" SET "propertyType" = 'APPARTEMENT' WHERE "propertyType" = 'APARTMENT';
UPDATE "Listing" SET "propertyType" = 'PARCELLE' WHERE "propertyType" = 'LAND';
UPDATE "Listing" SET "propertyType" = 'MAISON' WHERE "propertyType" = 'DUPLEX';
UPDATE "Listing" SET "propertyType" = 'BUREAU' WHERE "propertyType" = 'OFFICE';
UPDATE "Listing" SET "propertyType" = 'BOUTIQUE' WHERE "propertyType" = 'WAREHOUSE';
