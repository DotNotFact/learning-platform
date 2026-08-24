# Скрипты для работы с базой данных

Все скрипты используют UTF-8 кодировку для правильного отображения русского текста.

## Доступные скрипты

### Управление пользователями

#### `npm run create-admin`
Создает администратора в системе.

**Переменные окружения:**
- `ADMIN_EMAIL` (по умолчанию: `admin@example.com`)
- `ADMIN_PASSWORD` (по умолчанию: `admin123`)
- `ADMIN_NAME` (по умолчанию: `Администратор`)

**Пример:**
```bash
ADMIN_EMAIL=myadmin@example.com ADMIN_PASSWORD=mypass123 npm run create-admin
```

#### `npm run create-admin:force`
Принудительно создает администратора, удаляя существующего пользователя с таким email.

#### `npm run show-admin`
Показывает всех администраторов в системе.

#### `npm run create-test-users`
Создает тестовых пользователей всех ролей:
- `teacher@example.com` (TEACHER)
- `moderator@example.com` (MODERATOR)
- `manager@example.com` (MANAGER)
- `student@example.com` (STUDENT)

Пароль для всех: `{role}123` (например, `teacher123`)

### Управление курсами

#### `npm run create-course`
Интерактивный скрипт для создания нового курса.

**Интерактивный режим:**
```bash
npm run create-course
```

**С параметрами командной строки:**
```bash
npm run create-course -- --title "Название курса" --description "Описание" --category "programming" --difficulty "BEGINNER" --published "true"
```

**Параметры:**
- `--title` - Название курса (обязательно)
- `--description` - Описание курса
- `--category` - Slug или название категории
- `--difficulty` - BEGINNER, INTERMEDIATE или ADVANCED
- `--published` - true/false для публикации

**Пример:**
```bash
npm run create-course -- --title "React для начинающих" --description "Изучите основы React" --category "programming" --difficulty "BEGINNER"
```

#### `npm run create-courses`
Создает тестовые курсы с уроками, тестами и категориями:
- Основы JavaScript для начинающих
- Современный веб-дизайн

### Управление базой данных

#### `npm run reset-db`
**⚠️ ОПАСНО:** Полностью очищает базу данных, удаляя все данные.

Используйте только для разработки!

## Решение проблем с кодировкой

Если вы видите поломанную кодировку в базе данных:

1. **Проверьте кодировку терминала:**
   - Windows: используйте PowerShell или Git Bash
   - Убедитесь, что терминал поддерживает UTF-8

2. **Проверьте настройки Prisma:**
   - SQLite хранит данные в UTF-8 по умолчанию
   - Все скрипты используют `process.stdout.setDefaultEncoding("utf-8")`

3. **Используйте Prisma Studio для просмотра:**
   ```bash
   npm run db:studio
   ```
   Prisma Studio правильно отображает UTF-8 данные

4. **Если проблема сохраняется:**
   - Удалите `dev.db` файл
   - Выполните `npm run db:push` для создания новой БД
   - Запустите скрипты создания данных заново

## Структура скриптов

Все скрипты находятся в папке `scripts/` и используют:
- TypeScript с `tsx` для выполнения
- Prisma Client для работы с БД
- UTF-8 кодировку для всех строк
- Правильную обработку ошибок
- Информативный вывод в консоль

## Примеры использования

### Полная настройка с нуля:

```bash
# 1. Применить схему БД
npm run db:generate
npm run db:push

# 2. Создать администратора
npm run create-admin

# 3. Создать тестовых пользователей
npm run create-test-users

# 4. Создать тестовые курсы
npm run create-courses
```

### Сброс и пересоздание:

```bash
# 1. Очистить БД
npm run reset-db

# 2. Создать данные заново
npm run create-admin
npm run create-test-users
npm run create-courses
```
