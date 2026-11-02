# 계정 및 클라우드 동기화 검토

## 결론
- 무료이면서 카드 등록이 필요 없고, 사용자(프로젝트 소유자)의 별도 가입 없이 쓸 수 있는 인증·DB 서비스는 현실적으로 없습니다.
- Supabase와 Firebase는 무료 플랜이 있고 카드 없이 시작할 수 있지만, 소유자가 직접 계정과 프로젝트를 만들어 키를 발급해야 합니다.
- 그래서 이번 단계에서는 계정 없이 쓸 수 있는 대안(JSON 파일 내보내기/가져오기, 동기화 코드)을 구현했습니다. 내 프로필 화면 하단의 "데이터 백업 및 기기 간 이동"에서 사용할 수 있습니다.

## Supabase로 전환하려면 소유자가 해야 할 일
1. https://supabase.com 에 GitHub 계정으로 가입하고 Free 플랜으로 새 프로젝트를 만듭니다(카드 불필요, 7일 동안 사용이 없으면 일시 정지됨).
2. Authentication > Providers에서 Email(매직 링크) 또는 GitHub 로그인을 켭니다. Site URL에 배포 주소를 넣습니다.
3. SQL Editor에서 아래 테이블과 RLS 정책을 만듭니다.
   ```sql
   create table user_data (
     user_id uuid primary key references auth.users on delete cascade,
     data jsonb not null default '{}',
     updated_at timestamptz not null default now()
   );
   alter table user_data enable row level security;
   create policy "own row" on user_data for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
4. Project Settings > API에서 Project URL과 anon key를 복사해 Vercel 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`로 등록합니다(anon key는 RLS 전제하에 공개 가능, service_role 키는 절대 넣지 않음).
5. 그 다음 개발 작업: `@supabase/supabase-js` 추가, 로그인 화면, 로그인 시 `lib/backup.ts`의 내보내기 형식(`data`)을 그대로 `user_data.data`에 업서트, 충돌 시 `updated_at` 최근 값 우선. 비로그인 사용자는 지금처럼 localStorage만 사용합니다.
