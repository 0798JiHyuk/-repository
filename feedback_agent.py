import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class FeedbackAgent:
    def __init__(self):
        self.client = OpenAI()

    def analyze(self, chat_log, scenario_type="prosecutor"):
        # 1. 팩트체크 매트릭스 (기존 동일)
        if scenario_type == "loan":
            fact_matrix = """
            [대출 사기 팩트체크]
            1. 기존 대출 상환 요구: 은행은 절대 개인 계좌 입금을 요구하지 않음.
            2. 위약금/전산 락: 전형적인 사기 수법.
            3. 앱 설치: 문자로 온 URL 설치는 100% 해킹.
            """
        else:
            fact_matrix = """
            [검찰 사칭 팩트체크]
            1. 이중구속 파훼: '구속 vs 약식' 강요는 사기.
            2. 자산 검수: 존재하지 않는 절차.
            3. 공무집행방해: 전화 끊는다고 체포 안 됨.
            """

        # 2. 시스템 프롬프트 (타이밍 판단 로직 강화)
        system_prompt = f"""
        당신은 '보이스피싱 심층 분석관'입니다. 
        사용자의 대처를 '타이밍'과 '실질적 피해' 기준으로 엄격하게 평가하세요.

        [현재 시나리오]: {scenario_type}

        [★ 핵심 판단 기준: '소 잃고 외양간 고치기' 방지]
        사용자가 마지막에 전화를 끊었더라도, 그 **이전**에 치명적인 행동을 했는지 확인하십시오.

        1. **[이미 털린 경우] -> 무조건 0~20점 (방어 실패)**
           - 조건: 대화 도중 "설치했어요", "눌렀어요", "제출했어요", "보냈어요", "비밀번호는" 등의 말이 나옴.
           - 판정: 이미 해킹되거나 정보가 넘어간 상태입니다. 마지막에 욕을 하거나 끊어도 소용없습니다.
           - **Dominance Score**: 0~2점 (이미 주도권 뺏김)
           - **Sentiment**: "취약함 (정보 유출 후 도피)"

        2. **[잘 막은 경우] -> 90~100점 (방어 성공)**
           - 조건: 위와 같은 위험 행동을 **전혀 하지 않고**, 의심하거나 거절하며 끊음.
           - 판정: 완벽한 방어입니다.

        [출력 데이터 작성 가이드]
        1. **Summary**:
           - 털린 경우: "마지막에 전화를 끊으셨지만, 그전에 이미 악성 앱을 설치하셨기 때문에 방어에 실패했습니다." 라고 명확히 지적.
        2. **risk_keywords**: 위험 행동 키워드 추출.

        [Fact Matrix]
        {fact_matrix}

        [출력 포맷 (JSON)]
        {{
            "score": 0,
            "summary": "...",
            "good_points": [],
            "bad_points": [],
            "advice": "...",
            "detailed_analysis": {{
                "sentiment": "취약함",
                "risk_keywords": [],
                "dominance_score": 0
            }}
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(chat_log, ensure_ascii=False)},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content)

            # --- [Python 레벨 강제 보정] ---
            # AI가 놓칠 경우를 대비해, 파이썬 코드로 한 번 더 점수를 깎습니다.

            # 1. 위험 키워드 목록 정의
            fatal_triggers = ["눌렀어요", "깔았어요", "설치", "제출", "비밀번호", "입금", "보냈어요", "작성"]

            # 2. 대화 로그나 분석 결과에서 위험 키워드 찾기
            log_text = str(chat_log)
            detected_risks = result.get("detailed_analysis", {}).get("risk_keywords", [])

            is_compromised = False

            # 대화 로그 직접 검색 (AI가 놓쳐도 잡아냄)
            for trigger in fatal_triggers:
                if trigger in log_text:  # 사용자가 직접 말했으면
                    is_compromised = True
                    if trigger not in detected_risks:
                        detected_risks.append(trigger)

            # 3. 털렸으면 점수 강제 하향 (Hang-up 무효화)
            if is_compromised:
                if result["score"] > 30:
                    result["score"] = 10  # 10점으로 강등

                result["detailed_analysis"]["dominance_score"] = 1
                result["detailed_analysis"]["sentiment"] = "취약함 (사후약방문)"

                # 총평에 멘트 강제 추가
                if "이미" not in result["summary"]:
                    result["summary"] = "마지막에 전화를 끊으셨지만, 이미 위험한 행동(앱 설치/제출)을 하셨기에 사실상 모든 정보가 탈취되었습니다."

            # Advice 누락 방지
            if len(result.get("advice", "")) < 20:
                result["advice"] = fact_matrix.strip()

            return result

        except Exception as e:
            return {
                "score": 0,
                "summary": "분석 실패",
                "good_points": [],
                "bad_points": [],
                "advice": f"오류: {e}",
                "detailed_analysis": {
                    "sentiment": "시스템 오류",
                    "risk_keywords": [],
                    "dominance_score": 0,
                },
            }
