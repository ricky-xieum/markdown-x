# Admonition / Collapsible Test

본문 단락입니다. 아래는 다양한 펼침 블록 예시입니다.

## 1. 접힘 (기본)

??? note "테이블 (TABLE) 전체 명단 (481)"
    - ABA02TN_201606291310
    - ABC382TN_20201203
    - ABC383TN
    - ACCOUNT_INFO_20230608
    - ACCOUNT_INFO_T

## 2. 펼침 (?+)

???+ tip "기본으로 펼쳐진 팁"
    이 블록은 페이지 로드 시 펼쳐진 상태로 표시됩니다.

    내부에서 **굵게**, *기울임*, `코드`, [링크](https://example.com) 모두 동작합니다.

## 3. 타입별 색상

??? info "정보"
    파란 강조선

??? warning "경고"
    노란 강조선

??? danger "위험"
    빨간 강조선

## 4. 타입 없음

??? "타이틀만 있는 경우"
    본문

## 5. 타이틀 없음

??? note
    타이틀이 없으면 타입 이름이 요약으로 사용됩니다.

## 6. 코드 블록 안의 ??? (변환 안 됨)

```
??? note "이건 그대로 표시"
    body
```

## 7. raw HTML <details>도 동작

<details>
<summary>HTML로 직접 작성한 펼침</summary>

- 항목 A
- 항목 B

</details>
