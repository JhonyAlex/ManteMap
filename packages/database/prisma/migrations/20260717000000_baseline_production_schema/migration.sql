CREATE TYPE public."ProjectRole" AS ENUM (
    'OWNER',
    'MANAGER',
    'MEMBER',
    'VIEWER'
);

CREATE TYPE public."ProjectStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED',
    'DELETED'
);

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'PROJECT_MANAGER',
    'TECHNICIAN',
    'VIEWER'
);

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);

CREATE TABLE public.project_members (
    id text NOT NULL,
    "userId" text NOT NULL,
    "projectId" text NOT NULL,
    role public."ProjectRole" DEFAULT 'MEMBER'::public."ProjectRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.projects (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status public."ProjectStatus" DEFAULT 'ACTIVE'::public."ProjectStatus" NOT NULL,
    "ownerId" text NOT NULL,
    image text,
    config jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.users (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    "passwordHash" text,
    image text,
    role public."UserRole" DEFAULT 'TECHNICIAN'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");

CREATE UNIQUE INDEX "project_members_userId_projectId_key" ON public.project_members USING btree ("userId", "projectId");

CREATE UNIQUE INDEX projects_code_key ON public.projects USING btree (code);

CREATE INDEX "projects_ownerId_idx" ON public.projects USING btree ("ownerId");

CREATE INDEX projects_status_idx ON public.projects USING btree (status);

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX verification_tokens_identifier_token_key ON public.verification_tokens USING btree (identifier, token);

CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
