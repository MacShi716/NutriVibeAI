# 보고서 빌드 도구

NutriVibe AI 프로젝트 개발 계획서(수정 제출본)를 PDF·DOCX 로 생성하고 검증하는 스크립트 모음이다.
개인 정보(성명·학번)와 파일 이름은 코드에 넣지 않고 환경 변수로 전달한다.

## 요구 환경

- Python 3 (reportlab, matplotlib, python-docx, pypdf, PyMuPDF)
- Windows: Microsoft Word (DOCX → PDF 미리보기 변환용, `convert.ps1`)

## 빌드 절차

```powershell
$env:PYTHONIOENCODING='utf-8'          # 한글 경로 print 시 인코딩 오류 방지
$env:NV_STUDENT_NAME='<성명>'
$env:NV_STUDENT_ID='<학번>'
$env:NV_REPORT_NAME='<출력 파일 이름(확장자 제외)>'
$env:NV_OUT_DIR='<출력 폴더>'           # 생략 시 nutrivibe_build 의 상위 폴더

python make_figures.py                  # 그림 1·2 생성 (fig1_flow.png, fig2_arch.png)
python build_report.py                  # PDF + DOCX 생성
powershell -File convert.ps1            # DOCX → docx_preview.pdf (Word 필요)
python verify_report.py                 # 쪽수·필수 문구·고아 제목 검사
```

`NV_STUDENT_NAME`/`NV_STUDENT_ID` 를 비우면 표지의 성명·학번 칸이 빈 문자열로 출력된다.
`NV_REPORT_NAME` 을 생략하면 `NutriVibeAI_report` 로 저장된다.

## 파일 구성

- `content_v2.py` — 보고서 본문(TOC·ITEMS). 문장 수정은 이 파일에서 한다.
- `build_report.py` — 본문을 받아 PDF(reportlab)와 DOCX(python-docx)를 만든다.
- `make_figures.py` — 사용자 흐름도(그림 1)와 시스템 구성도(그림 2)를 그린다.
- `convert.ps1` — Word 로 DOCX 를 PDF 로 내보내 미리보기를 만든다.
- `verify_report.py` — 두 PDF 의 쪽수, 필수 문구 존재, 제목만 남은 페이지(고아) 여부를 검사한다.

## 알려진 동작

- `convert.ps1` 은 Word 기동 직후 첫 실행에서 COMException 을 낼 때가 있다. 이때는 한 번 더 실행하면 `EXPORT_OK` 가 나온다. `docx_preview.pdf` 의 수정 시각으로 성공 여부를 확인할 수 있다.
- `build_report.py` 는 표의 행이 페이지 경계에서 잘리지 않도록 `cantSplit` 을 적용하고, 그림 1 은 6.4cm, 그림 2 는 15.2cm 폭으로 배치한다.
