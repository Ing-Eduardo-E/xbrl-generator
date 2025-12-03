"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ESTRATOS = [
  { key: "estrato1", label: "Residencial Estrato 1" },
  { key: "estrato2", label: "Residencial Estrato 2" },
  { key: "estrato3", label: "Residencial Estrato 3" },
  { key: "estrato4", label: "Residencial Estrato 4" },
  { key: "estrato5", label: "Residencial Estrato 5" },
  { key: "estrato6", label: "Residencial Estrato 6" },
  { key: "industrial", label: "No residencial industrial" },
  { key: "comercial", label: "No residencial comercial" },
  { key: "oficial", label: "No residencial oficial" },
  { key: "especial", label: "No residencial especial" },
];

const SERVICIOS = [
  { key: "acueducto", label: "Acueducto" },
  { key: "alcantarillado", label: "Alcantarillado" },
  { key: "aseo", label: "Aseo" },
];

export interface UsuariosEstratoData {
  [servicio: string]: {
    [estrato: string]: number;
  };
}

interface UsuariosEstratoFormProps {
  initialValue?: UsuariosEstratoData;
  onSubmit: (data: UsuariosEstratoData) => void;
}

export function UsuariosEstratoForm({ initialValue, onSubmit }: UsuariosEstratoFormProps) {
  // Estado local para los usuarios por servicio y estrato
  const [usuarios, setUsuarios] = useState<UsuariosEstratoData>(() => {
    const base: UsuariosEstratoData = {};
    for (const servicio of SERVICIOS) {
      base[servicio.key] = {};
      for (const estrato of ESTRATOS) {
        base[servicio.key][estrato.key] = initialValue?.[servicio.key]?.[estrato.key] ?? 0;
      }
    }
    return base;
  });

  const handleChange = (servicio: string, estrato: string, value: string) => {
    setUsuarios((prev) => ({
      ...prev,
      [servicio]: {
        ...prev[servicio],
        [estrato]: Number(value) || 0,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calcular total de usuarios para mostrar en el toast
    let totalUsuarios = 0;
    for (const servicio of SERVICIOS) {
      for (const estrato of ESTRATOS) {
        totalUsuarios += usuarios[servicio.key][estrato.key];
      }
    }
    
    onSubmit(usuarios);
    
    // Mostrar confirmación con resumen
    toast.success('Usuarios guardados correctamente', {
      description: `Total: ${totalUsuarios.toLocaleString()} usuarios registrados. Los datos se enviarán al servidor cuando presiones "Distribuir Balance".`,
    });
    
    console.log('📊 Usuarios por estrato guardados localmente:', JSON.stringify(usuarios, null, 2));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Usuarios por Estrato y Servicio</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-2 bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-semibold text-left">Estrato / Tipo de usuario</th>
                {SERVICIOS.map((servicio) => (
                  <th key={servicio.key} className="border px-2 py-2 bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 font-semibold text-center">{servicio.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ESTRATOS.map((estrato) => (
                <tr key={estrato.key}>
                  <td className="border px-2 py-2 font-medium bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">{estrato.label}</td>
                  {SERVICIOS.map((servicio) => (
                    <td key={servicio.key} className="border px-2 py-2 text-center bg-white dark:bg-slate-950">
                      <Input
                        type="number"
                        min={0}
                        value={usuarios[servicio.key][estrato.key]}
                        onChange={(e) => handleChange(servicio.key, estrato.key, e.target.value)}
                        className="w-20 text-right"
                        inputMode="numeric"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-6">
          <Button type="submit">Guardar usuarios</Button>
        </div>
      </Card>
    </form>
  );
}