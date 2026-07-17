CREATE TYPE public."ItemTypeStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);

CREATE TABLE public.item_types (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    color text,
    status public."ItemTypeStatus" DEFAULT 'ACTIVE'::public."ItemTypeStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX item_types_projectId_slug_key ON public.item_types USING btree ("projectId", slug);

CREATE INDEX item_types_projectId_status_idx ON public.item_types USING btree ("projectId", status);

CREATE INDEX item_types_projectId_name_idx ON public.item_types USING btree ("projectId", name);

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT "item_types_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;
