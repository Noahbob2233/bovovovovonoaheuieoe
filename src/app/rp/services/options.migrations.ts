const migrations: [string, () => void][] = [
    ['Copy challenge from old beta', () => {
        // was there previously a challenge recorded?
        const hash = JSON.parse(localStorage.getItem('rpnow.challenge.hash'));
        const secret = JSON.parse(localStorage.getItem('rpnow.challenge.secret'));

        if (hash && secret) {
            localStorage.clear();
            localStorage.setItem('rpnow.global.challenge', JSON.stringify({ hash, secret }));
        }
    }]
];

let alreadyDone = false;

export function migrateOptions() {
    if (alreadyDone) return;
    alreadyDone = true;

    const completedMigrations: string[] = JSON.parse(localStorage.getItem('rpnow.migrations')) || [];

    migrations
        .filter(([migrationName, _]) => completedMigrations.indexOf(migrationName) === -1)
        .forEach(([migrationName, migrate]) => {
            console.log('LocalStorage option migration: ' + migrationName);

            migrate();

            completedMigrations.push(migrationName);
            localStorage.setItem('rpnow.migrations', JSON.stringify(completedMigrations));
        });
}
