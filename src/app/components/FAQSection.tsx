'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SUBSCRIPTION } from '@/constants/app';

const faqs = [
  {
    question: '무료 체험은 몇 번까지 가능한가요?',
    answer: `가입 후 무료로 ${SUBSCRIPTION.FREE_ANALYSES_COUNT}회까지 사주 분석을 이용할 수 있습니다. 무료 체험 횟수를 모두 사용하신 후에는 Pro 요금제로 업그레이드하여 계속 이용하실 수 있습니다.`,
  },
  {
    question: 'Pro 구독은 어떻게 결제하나요?',
    answer: `Pro 구독은 토스페이먼츠를 통해 안전하게 결제됩니다. 월 ${SUBSCRIPTION.PRO_PRICE.toLocaleString()}원으로 매달 ${SUBSCRIPTION.PRO_ANALYSES_COUNT}회의 분석을 이용할 수 있으며, 자동 정기결제로 편리하게 관리됩니다.`,
  },
  {
    question: '출생 시간을 모르면 분석이 불가능한가요?',
    answer: '출생 시간을 모르시는 경우에도 분석이 가능합니다. "출생시간 모름" 옵션을 선택하시면 삼주(년, 월, 일주) 기반으로 분석이 진행됩니다. 다만, 시주가 포함된 사주팔자 분석보다는 일부 정보가 제한될 수 있습니다.',
  },
  {
    question: '구독을 취소하면 환불이 되나요?',
    answer: '구독을 취소하시면 다음 결제일까지는 Pro 혜택을 계속 이용하실 수 있으며, 이후 자동으로 Free 요금제로 전환됩니다. 이미 결제된 금액에 대한 부분 환불은 제공되지 않습니다.',
  },
  {
    question: '과거 분석 내역을 확인할 수 있나요?',
    answer: '네, 모든 분석 내역은 자동으로 저장되어 대시보드에서 언제든지 확인하실 수 있습니다. 분석 결과는 영구적으로 보관되며, 검색 기능을 통해 특정 분석을 쉽게 찾을 수 있습니다.',
  },
  {
    question: 'Gemini Flash와 Pro 모델의 차이는 무엇인가요?',
    answer: 'Gemini 2.5 Flash는 빠르고 효율적인 분석을 제공하는 모델이며, Gemini 2.5 Pro는 더 깊이 있고 상세한 분석을 제공합니다. Pro 모델은 더 많은 컨텍스트를 이해하고 더 전문적인 통찰을 제공합니다.',
  },
];

export function FAQSection() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold">자주 묻는 질문</h2>
        <p className="mt-4 text-muted-foreground">
          궁금하신 점을 확인해보세요
        </p>
      </div>
      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
