# AnonChat - Anonymous Random Chat Application

## Overview

AnonChat is a real-time anonymous chat application that randomly pairs users for one-on-one conversations. The platform emphasizes privacy and simplicity—no registration, no profiles, just instant anonymous connections with strangers worldwide. The application features a modern landing page, live chat interface with typing indicators, and an admin panel for moderation and monitoring.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (landing page, chat, admin)
- TanStack Query (React Query) for server state management

**UI Component System**
- Shadcn UI component library with Radix UI primitives for accessible, composable components
- Tailwind CSS for utility-first styling with custom design tokens
- Theme system supporting light/dark modes with system preference detection
- Design inspired by modern messaging platforms (Discord, Telegram) with Material Design principles

**State Management Strategy**
- WebSocket-based real-time state for chat messages and connection status
- Local React state for UI interactions (typing indicators, input values)
- Custom SocketManager singleton for centralized WebSocket connection handling with automatic reconnection logic
- Toast notifications for user feedback and error handling

**Key Frontend Patterns**
- Component composition with separation of UI components (`/components/ui`) from page components (`/pages`)
- Custom hooks for reusable logic (`use-toast`, `use-mobile`, theme management)
- Type-safe API communication with shared schemas between client and server

### Backend Architecture

**Server Framework**
- Express.js HTTP server with WebSocket support via the `ws` library
- Single HTTP server instance handling both REST endpoints and WebSocket upgrades
- Request logging middleware for monitoring API performance

**Real-Time Communication**
- WebSocket server for bidirectional client-server communication
- Custom user matching algorithm that pairs waiting users from a queue
- In-memory tracking of active connections, chat sessions, and waiting users
- Message sanitization and validation using Zod schemas

**Session & User Management**
- Stateless user identification via unique IDs generated per WebSocket connection
- IP-based tracking for moderation (ban system) using client IP extraction from headers
- No authentication system—users are fully anonymous by design

**Data Storage Pattern**
- In-memory storage implementation (`MemStorage` class) for active sessions, waiting queue, and banned IPs
- Interface-based storage abstraction (`IStorage`) allowing future database implementation
- Daily message counter with automatic midnight reset
- Chat session tracking with metadata (start time, message count, last activity)

**Moderation & Admin Features**
- IP ban system with reason tracking and admin attribution
- Real-time statistics: active chats, waiting users, banned IPs, daily message count
- Admin panel with live updates for monitoring platform health

### Database Strategy

**Current Implementation**
- Pure in-memory storage with no persistence layer
- Data exists only during server runtime—restarts clear all state
- Suitable for prototype/MVP deployment with acceptable data loss on restart

**Future Database Considerations**
- Drizzle ORM configured for PostgreSQL (via `@neondatabase/serverless`)
- Schema definition ready in `shared/schema.ts` but not actively used
- Migration setup via `drizzle-kit` for future persistence implementation
- Connection string expected via `DATABASE_URL` environment variable

**Rationale for Current Approach**
- Simplifies initial deployment without database provisioning
- Reduces operational complexity for anonymous chat use case
- No sensitive data requiring persistence (all conversations are ephemeral)
- Easy transition path to persistent storage when needed via `IStorage` interface

### Security & Validation

**Input Sanitization**
- HTML entity encoding for all user messages to prevent XSS attacks
- Message length limits (2000 characters) to prevent abuse
- Content trimming and normalization before broadcast

**IP-Based Protections**
- IP extraction from `x-forwarded-for` header with fallback to socket address
- Banned IP checking before WebSocket connection establishment
- Admin-controlled ban system with reason logging

**Schema Validation**
- Zod schemas for type-safe message validation
- Shared type definitions between client and server prevent type mismatches

## External Dependencies

### Core Infrastructure
- **Node.js Runtime**: Server execution environment
- **PostgreSQL (Future)**: Configured via Neon serverless driver but not currently active
- **WebSocket Protocol**: Real-time bidirectional communication standard

### Frontend Libraries
- **React & React DOM**: UI framework (v18)
- **Vite**: Build tool and dev server with HMR support
- **Wouter**: Lightweight routing library
- **TanStack Query**: Server state management
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless accessible component primitives (20+ component packages)
- **Lucide React**: Icon library for UI elements

### Backend Libraries
- **Express.js**: HTTP server framework
- **ws**: WebSocket implementation for Node.js
- **Drizzle ORM**: TypeScript ORM (configured, not actively used)
- **Zod**: Runtime type validation and schema definition
- **nanoid**: Compact unique ID generation

### Development Tools
- **TypeScript**: Type safety across full stack
- **ESBuild**: Server-side bundling for production
- **PostCSS & Autoprefixer**: CSS processing pipeline
- **Replit Plugins**: Development environment integration (cartographer, dev banner, error overlay)

### Design System Dependencies
- **Google Fonts**: Inter, DM Sans, Fira Code, Geist Mono typography
- **Class Variance Authority**: Component variant management
- **clsx & tailwind-merge**: Conditional className utilities