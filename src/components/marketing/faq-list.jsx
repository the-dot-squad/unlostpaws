"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FAQ accordion — expects server-sanitized `answerHtml` from parseFaqBody().
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
            <div
              className="leading-relaxed [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: item.answerHtml }}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
