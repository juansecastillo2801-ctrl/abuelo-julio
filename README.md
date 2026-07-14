# Abuelo Julio — Sistema de Gestión

Sistema de gestión comercial para Abuelo Julio Premium Beef.

## Stack

- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **Deploy:** Vercel

## Setup

1. Clonar el repo
2. `cp .env.local.example .env.local` y completar las variables
3. `npm install`
4. Ejecutar las migraciones SQL en Supabase (carpeta `supabase/migrations/`)
5. `npm run dev`

## Módulos

- **Dashboard** — Resumen de ventas, pedidos y stock
- **Ventas** — Registro y POS rápido
- **Pedidos** — Gestión de pedidos y entregas
- **Clientes** — Base de clientes
- **Productos** — Catálogo de cortes y precios
- **Stock** — Inventario y movimientos
- **Pagos** — Cobros y estado de pagos
- **Equipo** — Gestión de usuarios
- **Configuración** — Ajustes del sistema
