CREATE TABLE IF NOT EXISTS public."TrailerOption"
(
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 ),
    ria_id bigint NOT NULL,
    url_ria text COLLATE pg_catalog."default",
    price_usd integer NOT NULL,
    mileage integer,
    location text COLLATE pg_catalog."default",
    body_type_trailers text COLLATE pg_catalog."default",
    description text COLLATE pg_catalog."default",
    trailer_photo_id bigint NOT NULL,
    CONSTRAINT "TrailerOption_pkey" PRIMARY KEY (id),
    CONSTRAINT traileroption_id_key UNIQUE (ria_id),
    CONSTRAINT trailer_photo_id FOREIGN KEY (trailer_photo_id)
        REFERENCES public."TrailerPhoto" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."TrailerOption"
    OWNER to postgres;

    CREATE TABLE IF NOT EXISTS public."TrailerPhoto"
(
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 ),
    photos text[] COLLATE pg_catalog."default",
    CONSTRAINT "TrailerPhoto_pkey" PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."TrailerPhoto"
    OWNER to postgres;