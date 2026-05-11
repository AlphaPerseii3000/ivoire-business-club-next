export function Footer() {
  return (
    <footer className="border-t bg-card py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-primary">Ivoire Business Club</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bâtir son futur en Afrique
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Contact</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              📧 sarah@ivoire-business-club.com<br />
              📞 +41 79 421 47 89
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Légal</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Mentions légales<br />
              Politique de confidentialité<br />
              CGV
            </p>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ivoire Business Club. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
