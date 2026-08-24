import type { NextAuthConfig } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { Session, User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import NextAuth from "next-auth"
import type { UserRole } from "@/types"

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _request) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Необходимо указать email и пароль")
        }

        const email = String(credentials.email)
        const password = String(credentials.password)

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) {
          throw new Error("Пользователь не найден")
        }

        const isValid = await compare(password, user.passwordHash)

        if (!isValid) {
          throw new Error("Неверный пароль")
        }

        return {
          id: user.userUid,
          email: user.email,
          name: user.name || undefined,
          role: user.role as UserRole,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user && user.id) {
        token.id = user.id
        token.role = (user as User & { role: UserRole }).role
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
