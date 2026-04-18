import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function GuiaCreador() {
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">🎉 Guía para Creadores</CardTitle>
          <p className="text-muted-foreground">
            Cómo hacer tu primera transmisión en vivo y recibir propinas
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Step 1 */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h2 className="text-2xl font-bold mb-2">Paso 1: Configura tu Pago</h2>
            <p className="mb-4">Primero necesitas decirle a CreatorVault cómo enviarte el dinero.</p>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li>Haz clic en el menú (☰) arriba a la derecha</li>
              <li>Busca <strong>"My Earnings"</strong> (Mis Ganancias)</li>
              <li>Haz clic en <strong>"Setup Payout Details"</strong></li>
              <li>Escribe tu Cash App o PayPal</li>
              <li>Haz clic en <strong>"Save"</strong></li>
            </ol>
            <Button onClick={() => setLocation("/payout-setup")}>
              Ir a Configurar Pago
            </Button>
          </div>

          {/* Step 2 */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h2 className="text-2xl font-bold mb-2">Paso 2: Empieza tu Transmisión</h2>
            <p className="mb-4">Ahora puedes hacer tu primera transmisión en vivo.</p>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li>Haz clic en el menú (☰)</li>
              <li>Haz clic en <strong>"VaultLive (85/15)"</strong></li>
              <li>Escribe un título para tu transmisión</li>
              <li>Haz clic en el botón grande <strong>"Go Live"</strong></li>
            </ol>
            <Button onClick={() => setLocation("/vaultlive")}>
              Ir a VaultLive
            </Button>
          </div>

          {/* Step 3 */}
          <div className="border-l-4 border-green-500 pl-4">
            <h2 className="text-2xl font-bold mb-2">Paso 3: Recibe Propinas</h2>
            <p className="mb-4">Cuando estés en vivo, tus fans pueden darte propinas.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Los fans hacen clic en <strong>"Tip $5"</strong></li>
              <li>Tú recibes <strong>$4.25</strong> (85% de $5)</li>
              <li>CreatorVault se queda con $0.75 (15%)</li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <h2 className="text-2xl font-bold mb-2">Paso 4: Ve tu Dinero</h2>
            <p className="mb-4">Puedes ver cuánto dinero has ganado.</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Ve a <strong>"VaultLive (85/15)"</strong></li>
              <li>Mira la sección <strong>"Your Balance"</strong></li>
              <li><strong>"Pending"</strong> = esperando confirmación</li>
              <li><strong>"Confirmed"</strong> = listo para retirar</li>
            </ol>
          </div>

          {/* Important */}
          <div className="bg-purple-50 dark:bg-purple-950 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2">⚠️ Importante</h3>
            <p className="mb-2">
              <strong>Cameron</strong> (el administrador) tiene que confirmar cada propina antes de que aparezca en "Confirmed".
            </p>
            <p>
              Esto es solo para la prueba. Después será automático.
            </p>
          </div>

          {/* Help */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              ¿Tienes preguntas? Pregúntale a Cameron.
            </p>
            <Button onClick={() => setLocation("/vaultlive")} size="lg">
              Empezar Ahora →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
