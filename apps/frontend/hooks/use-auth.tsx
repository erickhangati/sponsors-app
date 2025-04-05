"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type User = {
    id: string
    name: string
    email: string
    role: "admin" | "sponsor" | "child"
    avatar?: string
}

type AuthContextType = {
    user: User | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem("token")

        if (!token) {
            setIsLoading(false)
            return
        }

        // Fetch user profile
        fetch("/api/users/me", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch user profile")
                }
                return res.json()
            })
            .then((data) => {
                setUser(data)
            })
            .catch((error) => {
                console.error("Error fetching user profile:", error)
                localStorage.removeItem("token")
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true)

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || "Login failed")
            }

            localStorage.setItem("token", data.access_token)
            setUser(data.user)

            // Redirect based on user role
            if (data.user.role === "admin") {
                router.push("/admin")
            } else if (data.user.role === "sponsor") {
                router.push("/sponsor")
            } else {
                router.push("/profile")
            }
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        localStorage.removeItem("token")
        setUser(null)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
    {children}
    </AuthContext.Provider>
)
}

export function useAuth() {
    const context = useContext(AuthContext)

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    return context
}