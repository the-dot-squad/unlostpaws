"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SafeHtml } from "@/components/marketing/safe-html";

/**
 * FAQ accordion — answer HTML is sanitized at parse time and again at render.
 * @param {{ items: { question: string, answerHtml: string }[] }} props
 */
export function FaqList({ items }) {
  if (!items?.length) return null;

  return (
    <Accordion type="single" collapsible className="not-prose w-full">
      {items.map((item, index) => (
        <AccordionItem key={`faq-${index}`} value={`faq-${index}`}>
          <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
          <AccordionContent>
            <SafeHtml
              html={item.answerHtml}
              className="leading-relaxed [&_a]:text-primary [&_a]:underline"
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
