# PennQuinn.com

## Overview

PennQuinn.com is a family photo blog built as a full-stack web application. The project displays blog posts migrated from WordPress, featuring photos and content organized by categories and tags. The application uses a React frontend with a modern component library and an Express backend, with PostgreSQL database support via Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables defined in CSS
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API routes prefixed with `/api`
- **Static Serving**: Express serves the built React app in production
- **Development**: Vite dev server with HMR proxied through Express

### Data Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)
- **Schema**: Defined in `shared/schema.ts` using Drizzle's PostgreSQL dialect
- **Migrations**: Managed via `drizzle-kit push` command
- **Validation**: Zod schemas generated from Drizzle schemas using `drizzle-zod`

### Content Management
- **Static Posts**: Blog posts are stored as JSON in `client/src/data/posts.json`
- **WordPress Migration**: Script at `script/parse-wordpress.ts` converts WordPress XML exports to JSON
- **Image Storage**: Post images served from `/uploads` directory paths

### Build System
- **Client Build**: Vite compiles React app to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs`
- **Build Script**: Custom TypeScript build script at `script/build.ts`

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/ui/  # Shadcn/ui components
│   │   ├── pages/         # Route page components
│   │   ├── lib/           # Utility functions and helpers
│   │   ├── hooks/         # Custom React hooks
│   │   └── data/          # Static JSON data files
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer interface
│   └── static.ts     # Static file serving
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
└── script/           # Build and utility scripts
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI Framework
- **Radix UI**: Headless UI primitives (dialogs, dropdowns, tooltips, etc.)
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant styling

### Development Tools
- **Vite**: Frontend build tool and dev server
- **TSX**: TypeScript execution for Node.js
- **Drizzle Kit**: Database migration tooling

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit development integration
- **@replit/vite-plugin-dev-banner**: Development environment banner