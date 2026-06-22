// components/employee-management.tsx 
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Loader2, Users, TrendingUp, Shield, Award, Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_PAGES } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

const fetchEmployees = async () => {
  return apiClient.getEmployees();
};

function EmployeeStats({ employees }: { employees: any[] }) {
  const stats = [
    { label: "Total de Membros", value: employees.length.toString(), icon: Users, color: "text-blue-600", bg: "from-blue-50 to-blue-100", trend: "+5%" },
    { label: "Administradores", value: employees.filter(e => e.role === 'admin' || e.roles?.name?.toLowerCase().includes('admin')).length.toString(), icon: Shield, color: "text-purple-600", bg: "from-purple-50 to-purple-100", trend: "+2%" },
    { label: "Advogados", value: employees.filter(e => e.role === 'member' || e.roles?.name?.toLowerCase().includes('advogado')).length.toString(), icon: Award, color: "text-green-600", bg: "from-green-50 to-green-100", trend: "+8%" },
    { label: "Equipe Ativa", value: employees.length.toString(), icon: TrendingUp, color: "text-orange-600", bg: "from-orange-50 to-orange-100", trend: "100%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;
        return (
          <Card key={index} className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-0 bg-white relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <StatIcon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function EmployeeManagement() {
  const { user: currentUser } = useAuth();
  const { data: employees, isLoading, isError, error } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [role, setRole] = useState<string>("member");
  const [permissions, setPermissions] = useState<string[]>([]);

  const openEditModal = (employee: any) => {
    setSelectedEmployee(employee);
    setRole(employee.role || "member");
    setPermissions(employee.permissions || []);
    setIsModalOpen(true);
  };

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { id: string, role: string, permissions: string[] }) => {
      if (!data.id) {
        throw new Error("ID do usuário não foi encontrado para atualização.");
      }

      const res = await fetch(`/api/team/${data.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: data.role, permissions: data.permissions })
      });
      if (!res.ok) throw new Error("Erro ao atualizar permissões");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Permissões atualizadas com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!selectedEmployee) return;
    updatePermissionsMutation.mutate({
      id: selectedEmployee.id,
      role,
      permissions
    });
  };
  
  const togglePermission = (key: string) => {
    setPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500 mx-auto" />
          <p className="text-slate-600 font-medium">Carregando equipe...</p>
        </div>
      </div>
    );
  }

  if (isError) return <div>Erro ao carregar equipe: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="relative bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-10"></div>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-3">Gerenciamento de Equipe</h2>
          <p className="text-slate-100 text-xl">Visualize e gerencie os membros da sua equipe jurídica.</p>
        </div>
      </div>

      {employees && <EmployeeStats employees={employees} />}

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <CardTitle className="text-2xl font-bold text-slate-900">Membros da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200">
                <TableHead className="text-slate-700 font-bold">Membro</TableHead>
                <TableHead className="text-slate-700 font-bold">Email</TableHead>
                <TableHead className="text-slate-700 font-bold">Cargo</TableHead>
                <TableHead className="text-right text-slate-700 font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees && employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id} className="group hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent transition-all duration-200">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative group-hover:scale-110 transition-transform">
                          <Avatar className="ring-2 ring-slate-200 group-hover:ring-slate-400 transition-all">
                            <AvatarImage src={employee.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white font-bold">
                              {(employee.name || employee.full_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="font-medium group-hover:text-slate-700 transition-colors">{employee.name || employee.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{employee.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300">
                        {employee.role === 'admin' ? 'Administrador' : employee.role === 'member' ? 'Advogado / Membro' : employee.role || employee.roles?.name || 'Não definido'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(employee)}>
                        <Settings className="h-4 w-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-16">
                    <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhum membro encontrado</h3>
                    <p className="text-slate-500">Não há membros da equipe cadastrados no momento.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Permissões de Acesso</DialogTitle>
            <DialogDescription>
              Configure o nível de acesso e as páginas visíveis para {selectedEmployee?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nível de Acesso (Cargo)</Label>
              <Select 
                value={role} 
                onValueChange={setRole}
                disabled={currentUser?.id === selectedEmployee?.id}
              >
                <SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="member">Membro / Advogado</SelectItem>
                  <SelectItem value="user">Usuário Básico</SelectItem>
                </SelectContent>
              </Select>
              {currentUser?.id === selectedEmployee?.id && (
                <p className="text-xs text-amber-600 mt-1">
                  Você não pode alterar o seu próprio nível de acesso.
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label>Páginas Permitidas</Label>
              <div className="grid grid-cols-2 gap-3 border rounded-lg p-4 bg-slate-50">
                {AVAILABLE_PAGES.map(page => (
                  <div key={page.key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`page-${page.key}`}
                      checked={role === 'admin' || permissions.includes(page.key)}
                      disabled={role === 'admin'}
                      onCheckedChange={() => togglePermission(page.key)}
                    />
                    <Label 
                      htmlFor={`page-${page.key}`}
                      className={`text-sm font-normal cursor-pointer ${role === 'admin' ? 'opacity-50' : ''}`}
                    >
                      {page.label}
                    </Label>
                  </div>
                ))}
              </div>
              {role === 'admin' && (
                <p className="text-xs text-slate-500">Administradores têm acesso a todas as páginas por padrão.</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-2 border-slate-200 rounded-xl">Cancelar</Button>
            <Button 
              onClick={handleSave} 
              disabled={updatePermissionsMutation.isPending}
              className="bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 shadow-lg rounded-xl text-white"
            >
              {updatePermissionsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}