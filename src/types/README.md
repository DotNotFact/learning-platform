# Архитектура типов

Проект использует доменно-ориентированную архитектуру типов, где каждый домен имеет свой файл с типами.

## Структура

```
src/types/
├── index.ts          # Центральная точка экспорта всех типов
├── course.ts         # Типы для курсов
├── user.ts           # Типы для пользователей
├── video.ts          # Типы для видео
├── quiz.ts           # Типы для тестов и вопросов
└── api.ts            # Типы для API responses
```

## Домены

### Course (`course.ts`)

- **`Course`** - Базовая модель курса
- **`CourseAuthor`** - Информация об авторе
- **`CourseWithAuthor`** - Курс с автором
- **`CourseListItem`** - Курс для списка (минимальные данные)
- **`CourseDetails`** - Полная информация о курсе (с видео и тестами)

**Использование:**
```typescript
import type { CourseDetails, CourseListItem } from '@/types'

// Для списка курсов
const courses: CourseListItem[] = ...

// Для детальной страницы
const course: CourseDetails = ...
```

### User (`user.ts`)

- **`UserRole`** - Роли пользователей: "STUDENT" | "INSTRUCTOR" | "ADMIN"
- **`User`** - Полная модель пользователя
- **`UserBasic`** - Базовая информация о пользователе
- **`UserWithStats`** - Пользователь со статистикой

**Использование:**
```typescript
import type { UserBasic, UserRole } from '@/types'

const user: UserBasic = {
  userUid: "...",
  email: "...",
  name: "...",
  role: "ADMIN" as UserRole,
  createdAt: new Date()
}
```

### Video (`video.ts`)

- **`Video`** - Модель видео
- **`VideoCreateInput`** - Данные для создания видео
- **`VideoUpdateInput`** - Данные для обновления видео

### Quiz (`quiz.ts`)

- **`Quiz`** - Модель теста
- **`Question`** - Модель вопроса (может содержать JSON строки для SQLite)
- **`QuestionParsed`** - Вопрос после парсинга JSON
- **`QuestionOption`** - Вариант ответа
- **`QuizWithQuestions`** - Тест с вопросами
- **`QuizAttempt`** - Попытка прохождения теста
- **`QuizCreateInput`** - Данные для создания теста
- **`QuestionCreateInput`** - Данные для создания вопроса

### API (`api.ts`)

Типы для API responses:
- **`CourseListResponse`** - Список курсов
- **`CourseDetailsResponse`** - Детали курса
- **`UserListResponse`** - Список пользователей
- **`QuizDetailsResponse`** - Детали теста
- **`ApiErrorResponse`** - Ошибка API
- **`ApiSuccessResponse<T>`** - Успешный ответ

## Принципы

1. **Разделение по доменам** - Каждый домен имеет свой файл
2. **Явные типы** - Все типы явно определены, нет `any`
3. **Переиспользование** - Базовые типы расширяются для конкретных случаев
4. **Типы для API** - Отдельные типы для запросов и ответов

## Миграция с CourseWithRelations

Старый тип `CourseWithRelations` помечен как `@deprecated`. Используйте:

- **`CourseDetails`** - для полной информации о курсе
- **`CourseListItem`** - для списков курсов
- **`CourseWithAuthor`** - для курса с автором

## Примеры использования

### В компонентах

```typescript
import type { CourseDetails, CourseListItem } from '@/types'

interface Props {
  course: CourseDetails
  onUpdate: (course: CourseDetails) => void
}
```

### В API routes

```typescript
import type { CourseDetailsResponse, ApiErrorResponse } from '@/types'

export async function GET(): Promise<CourseDetailsResponse | ApiErrorResponse> {
  // ...
}
```

### Маппинг из Prisma

```typescript
import type { CourseDetails } from '@/types'

const courseData = await db.course.findUnique({...})

const course: CourseDetails = {
  ...courseData,
  author: {
    name: courseData.author.name,
    email: courseData.author.email,
  },
  videos: courseData.videos.map(v => ({...})),
  quizzes: courseData.quizzes.map(q => ({...})),
}
```
