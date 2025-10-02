import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Gauge, DollarSign, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DashboardStats {
  totalVehicles: number;
  totalKm: number;
  maintenanceCost: number;
  maintenancesByType: { type: string; count: number }[];
  vehiclesByStatus: { status: string; count: number; color: string }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    totalKm: 0,
    maintenanceCost: 0,
    maintenancesByType: [],
    vehiclesByStatus: [],
  });

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenances" }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDashboardData() {
    // Fetch vehicles
    const { data: vehicles } = await supabase.from("vehicles").select("*");
    
    // Fetch maintenances from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: maintenances } = await supabase
      .from("maintenances")
      .select("*")
      .eq("status", "Concluído")
      .gte("service_date", thirtyDaysAgo.toISOString());

    if (!vehicles) return;

    // Calculate stats
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === "Ativo");
    const totalKm = activeVehicles.reduce((sum, v) => sum + (v.km_current || 0), 0);
    const maintenanceCost = maintenances?.reduce((sum, m) => sum + (parseFloat(m.cost as any) || 0), 0) || 0;

    // Group maintenances by type
    const typeGroups: Record<string, number> = {};
    maintenances?.forEach(m => {
      typeGroups[m.service_type] = (typeGroups[m.service_type] || 0) + 1;
    });
    const maintenancesByType = Object.entries(typeGroups).map(([type, count]) => ({ type, count }));

    // Group vehicles by status
    const statusGroups: Record<string, number> = {};
    vehicles.forEach(v => {
      statusGroups[v.status] = (statusGroups[v.status] || 0) + 1;
    });
    
    const statusColors: Record<string, string> = {
      "Ativo": "#22c55e",
      "Em Manutenção": "#f59e0b",
      "Inativo": "#ef4444",
    };
    
    const vehiclesByStatus = Object.entries(statusGroups).map(([status, count]) => ({
      status,
      count,
      color: statusColors[status] || "#6b7280",
    }));

    setStats({
      totalVehicles,
      totalKm,
      maintenanceCost,
      maintenancesByType,
      vehiclesByStatus,
    });
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da sua frota</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Veículos
            </CardTitle>
            <Car className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em toda a frota
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              KM Total (Ativos)
            </CardTitle>
            <Gauge className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats.totalKm.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quilômetros acumulados
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo (Último Mês)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(stats.maintenanceCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manutenções concluídas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-shadow bg-gradient-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/90">
              Desempenho
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">Ótimo</div>
            <p className="text-xs text-primary-foreground/80 mt-1">
              Frota em dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Manutenções por Tipo
            </CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição dos serviços realizados</p>
          </CardHeader>
          <CardContent className="h-80">
            {stats.maintenancesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.maintenancesByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhuma manutenção registrada
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Status da Frota
            </CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição por status</p>
          </CardHeader>
          <CardContent className="h-80">
            {stats.vehiclesByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.vehiclesByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {stats.vehiclesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum veículo cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}