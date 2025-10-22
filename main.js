const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs');

program 
    .requiredOption('-i, --input <path>', 'input file path')
    .requiredOption('-h, --host <address>', 'server address')
    .requiredOption('-p, --port <number>', 'server port');

    program.parse(process.argv);

    const options = program.opts();

    if (!fs.existsSync(options.input)) {
        console.log('Cannot find input file');
        process.exit(1);
    } 

    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Сервер працює... \n');
    });

    server.listen(options.port, options.host, () => {
        console.log(`Сервер запущено на http://${options.host}:${options.port}`);
        console.log(`Файл для читання: ${options.input}`);
    });

    server.on('error', (err) => {
    console.error('Помилка сервера:', err.message);
    process.exit(1);
});