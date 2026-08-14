"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Save, Loader2, ShieldCheck, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Administrador", variant: "destructive" },
  member: { label: "Membro", variant: "secondary" },
  user: { label: "Usuário", variant: "outline" },
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  // Preenche os campos quando o modal abre ou o usuário muda
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
    }
  }, [isOpen, user])

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U"
    return nameStr
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const roleKey = (user?.role || "user") as keyof typeof ROLE_LABELS

const roleInfo = ROLE_LABELS[roleKey]
  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      })

      if (response.ok) {
        toast({ title: "Sucesso", description: "Perfil atualizado com sucesso" })
      } else {
        const { error } = await response.json()
        throw new Error(error)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar perfil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar + nome + cargo */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-light/50 border border-brand-light">
            <Avatar className="h-16 w-16 text-lg font-semibold">
              <AvatarFallback className="bg-[#2C3E50] text-white">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-brand text-base leading-tight">
                {name || "—"}
              </p>
              <p className="text-sm text-brand-sage">{email || "—"}</p>
              <div className="flex items-center gap-2 mt-1">
                {user?.role === "admin" ? (
                  <ShieldCheck className="h-4 w-4 text-red-500" />
                ) : (
                  <Users className="h-4 w-4 text-brand-gray" />
                )}
                <Badge variant={roleInfo?.variant as any} className="text-xs px-2 py-0.5">
                  {roleInfo?.label || user?.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Campos editáveis */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-brand-sage" />
              <span className="font-medium text-brand text-sm">Informações Pessoais</span>
            </div>

            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#2C3E50] hover:bg-[#3D566E]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
