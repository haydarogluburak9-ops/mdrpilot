import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminAccessDenied({ signedInAs }: { signedInAs: string }) {
  return (
    <div className="container flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Platform yönetimi</p>
      <h1 className="mt-2 text-2xl font-bold">Bu panele erişim yok</h1>
      <p className="mt-3 text-muted-foreground">
        Şu an <strong className="text-foreground">{signedInAs}</strong> ile giriş yaptınız. Admin paneli yalnızca
        yetkili e-posta adresleri için açıktır.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/login?next=/admin">
          <Button>Yetkili hesapla giriş yap</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Panele dön</Button>
        </Link>
      </div>
    </div>
  );
}
