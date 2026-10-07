export function Header() {
  return (
    <header className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-semibold">
            ق
          </div>
          <h1 className="text-3xl font-bold text-foreground">Qur&apos;an Recitation Evaluator</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-13">Master your recitation with AI-powered feedback</p>
      </div>
    </header>
  );
}
