const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs').promises;
const { XMLBuilder } = require('fast-xml-parser');
const url = require('node:url');

program 
  .requiredOption('-i, --input <path>', 'input file path')
  .requiredOption('-h, --host <address>', 'server address')
  .requiredOption('-p, --port <number>', 'server port');

program.parse(process.argv);

const options = program.opts();

// Синхронна перевірка існування файлу при старті
const fsSync = require('node:fs');
if (!fsSync.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    // Читання NDJSON файлу
    const data = await fs.readFile(options.input, 'utf-8');
    const lines = data.trim().split('\n');
    const passengers = lines
      .filter(line => line.trim().length > 0)
      .map(line => JSON.parse(line));

    // Парсинг URL та отримання query параметрів
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    // Фільтрація даних відповідно до параметрів
    let filteredData = passengers;

    // Фільтр: survived=true - показати лише тих, хто вижив
    if (query.survived === 'true') {
      filteredData = filteredData.filter(p => {
        // Перевірка різних варіантів значення Survived
        return p.Survived === 1 || p.Survived === '1' || p.Survived === true;
      });
        }

    // Формування вихідних даних
    const outputData = filteredData.map(passenger => {
      const result = {
        name: passenger.Name || 'Unknown',
        ticket: passenger.Ticket || 'N/A'
      };

      // Додати вік, якщо параметр age=true
      if (query.age === 'true') {
        result.age = passenger.Age !== undefined && passenger.Age !== null ? passenger.Age : 'N/A';
      }

      return result;
    });


    // Створення XML структури
    const xmlData = {
      passengers: {
        passenger: outputData
      }
    };

    // Перевірка чи є дані для виведення
    if (outputData.length === 0) {
      res.writeHead(200, { 
        'Content-Type': 'application/xml; charset=utf-8'
      });
      res.end('<?xml version="1.0" encoding="UTF-8"?>\n<passengers></passengers>');
      return;
    }

    // Налаштування XML builder
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  ',
      suppressEmptyNode: false
    });

    const xmlContent = builder.build(xmlData);

    // Відправка відповіді з XML декларацією
    res.writeHead(200, { 
      'Content-Type': 'application/xml; charset=utf-8'
    });
    res.end('<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent);

  } catch (err) {
    console.error('Помилка обробки запиту:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error\n');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  console.log(`Файл для читання: ${options.input}`);
  console.log('\nПриклади запитів:');
  console.log(`  http://${options.host}:${options.port}/`);
  console.log(`  http://${options.host}:${options.port}/?survived=true`);
  console.log(`  http://${options.host}:${options.port}/?age=true`);
  console.log(`  http://${options.host}:${options.port}/?survived=true&age=true`);
});

server.on('error', (err) => {
  console.error('Помилка сервера:', err.message);
  process.exit(1);
});