import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-3xl">Generador XBRL</CardTitle>
          <CardDescription>
            Sistema de generación de taxonomías XBRL para empresas de servicios públicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <Upload className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">1. Cargar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Subir archivo Excel con balance consolidado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileSpreadsheet className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">2. Distribuir</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Definir porcentajes por servicio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Download className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">3. Generar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Descargar archivos XBRL
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button size="lg" className="flex-1">
              Comenzar
            </Button>
            <Button size="lg" variant="outline">
              Ver Guía
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Estado:</span> Componentes shadcn/ui funcionando correctamente ✅
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
