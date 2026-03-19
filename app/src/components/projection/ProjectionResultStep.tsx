"use client";
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileSpreadsheet, Download } from "lucide-react";
import { toast } from '@/lib/safe-toast';

interface ProjectionResultStepProps {
  files: Array<{ fileName: string; base64: string; quarter: string }>;
  onReset: () => void;
}

function downloadFile(file: { fileName: string; base64: string }) {
  const byteCharacters = atob(file.base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ProjectionResultStep({ files, onReset }: ProjectionResultStepProps) {
  const downloadAll = () => {
    files.forEach((file, index) => {
      setTimeout(() => downloadFile(file), index * 300);
    });
    toast.success('Descargando todos los archivos...');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Banner de éxito */}
      <Card className="bg-gradient-to-r from-green-500 to-green-700 text-white shadow-md dark:from-green-900 dark:to-green-800 dark:text-green-200">
        <CardHeader className="flex flex-col items-center justify-center py-8">
          <CheckCircle2 className="w-14 h-14 mb-2 text-white dark:text-green-200" />
          <CardTitle className="text-2xl font-bold text-white dark:text-green-200 text-center">¡Proyecciones Generadas Exitosamente!</CardTitle>
          <p className="mt-2 text-white/90 dark:text-green-300 text-center text-base">Se generaron {files.length} archivos Excel trimestrales</p>
        </CardHeader>
      </Card>

      {/* Archivos generados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {files.map((file) => (
          <Card key={file.fileName} className="flex flex-col justify-between p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-300" />
              <div>
                <p className="font-medium text-sm break-all">{file.fileName}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">{file.quarter}</p>
              </div>
            </div>
            <Button
              onClick={() => downloadFile(file)}
              size="sm"
              variant="outline"
              className="mt-auto dark:bg-slate-800 dark:text-white dark:border-indigo-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </Card>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
        <Button
          className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold text-lg px-8 py-3 dark:from-indigo-900 dark:to-blue-900 dark:text-white"
          onClick={downloadAll}
        >
          <Download className="w-5 h-5 mr-2" />
          Descargar Todos
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto text-base px-8 py-3 border-2 border-indigo-500 dark:bg-slate-800 dark:text-white dark:border-indigo-700"
          onClick={onReset}
        >
          Nueva Proyección
        </Button>
      </div>
    </div>
  );
}