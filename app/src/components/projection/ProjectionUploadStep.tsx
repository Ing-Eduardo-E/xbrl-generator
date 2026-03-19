'use client';

import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Upload } from 'lucide-react';
import { toast } from '@/lib/safe-toast';
import { trpc } from '@/lib/trpc';

interface ParsedAccount {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

interface ProjectionUploadStepProps {
  onSuccess: (data: {
    accounts: ParsedAccount[];
    staticAccounts: ParsedAccount[];
    dynamicAccounts: ParsedAccount[];
    summary: { totalStatic: number; totalDynamic: number; staticPercent: number; dynamicPercent: number };
  }) => void;
}

export function ProjectionUploadStep({ onSuccess }: ProjectionUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.projection.uploadAndClassify.useMutation({
    onSuccess: (data) => {
      toast.success('Balance clasificado exitosamente', {
        description: `${data.summary.totalStatic} cuentas estáticas, ${data.summary.totalDynamic} cuentas dinámicas`,
      });
      onSuccess(data);
    },
    onError: (error) => {
      toast.error('Error al procesar el balance', {
        description: error.message,
      });
    },
  });

  const handleFile = (f: File) => {
    if (!f) return;
    if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(f.type) && !f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Archivo inválido', { description: 'Solo se permiten archivos Excel (.xlsx, .xls)' });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', { description: 'El archivo no debe superar 10MB' });
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(',')[1];
      await uploadMutation.mutateAsync({ fileData, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/30 border-0 shadow-none dark:border-slate-800">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <AlertCircle className="text-blue-600 dark:text-blue-300 w-6 h-6" />
          <div>
            <CardTitle className="text-blue-800 dark:text-blue-200 text-base">Sube tu balance anual consolidado</CardTitle>
            <CardContent className="p-0 text-slate-700 dark:text-slate-200 text-sm">
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Archivo Excel (.xlsx o .xls) con columnas: <b>CÓDIGO</b>, <b>DENOMINACIÓN</b>, <b>Total</b></li>
                <li>Debe incluir los códigos PUC</li>
                <li>El sistema clasificará automáticamente las cuentas para proyección</li>
              </ul>
            </CardContent>
          </div>
        </CardHeader>
      </Card>

      <div
        className={
          'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer select-none ' +
          (isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700'
            : 'border-slate-300 bg-white hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500')
        }
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        tabIndex={0}
        role="button"
        aria-label="Zona de carga de archivo"
      >
        <Upload className="w-10 h-10 text-blue-500 dark:text-blue-300 mb-2" />
        <span className="text-slate-700 dark:text-slate-200 text-sm mb-1">Arrastra tu archivo aquí o haz clic para seleccionar</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">Solo .xlsx o .xls, máximo 10MB</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />
        {file && (
          <div className="mt-3 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-2">
            <span className="truncate max-w-xs">{file.name}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:opacity-90 dark:from-blue-700 dark:to-indigo-700"
          disabled={!file || uploadMutation.isPending}
          onClick={handleUpload}
        >
          {uploadMutation.isPending ? (
            <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Subiendo...</span>
          ) : (
            'Subir y clasificar'
          )}
        </Button>
      </div>
    </div>
  );
}