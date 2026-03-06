import React from "react";
import { Box, Typography, Flex, Divider } from "@strapi/design-system";
import { Layouts, Page } from "@strapi/strapi/admin";

const THRESHOLDS = [
  {
    field: "Title",
    rows: [
      { range: "< 30 chars", status: "Too Short", color: "#d02b20" },
      { range: "30–49 chars", status: "Short", color: "#c07000" },
      { range: "50–60 chars", status: "Optimal", color: "#328048" },
      { range: "61–65 chars", status: "Long", color: "#c07000" },
      { range: "> 65 chars", status: "Too Long", color: "#d02b20" },
    ],
  },
  {
    field: "Description",
    rows: [
      { range: "< 120 chars", status: "Too Short", color: "#d02b20" },
      { range: "120–149 chars", status: "Short", color: "#c07000" },
      { range: "150–160 chars", status: "Optimal", color: "#328048" },
      { range: "161–165 chars", status: "Long", color: "#c07000" },
      { range: "> 165 chars", status: "Too Long", color: "#d02b20" },
    ],
  },
];

const CONTENT_RULES = [
  { condition: "Empty field", severity: "🔴 Error", color: "#d02b20" },
  { condition: "< 300 words", severity: "🔴 Error", color: "#d02b20" },
  { condition: "> 5000 words", severity: "🔴 Error", color: "#d02b20" },
  {
    condition: "Sentence > 25 words",
    severity: "⚠️ Warning",
    color: "#c07000",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Open any edit view",
    desc: "Navigate to Content Manager and open any entry to edit.",
  },
  {
    step: "02",
    title: "Start typing",
    desc: "Inline stats appear below the title and description fields immediately.",
  },
  {
    step: "03",
    title: "Check the sidebar",
    desc: "The right panel shows deep stats and validation rules for whichever field is active.",
  },
  {
    step: "04",
    title: "Follow the guidance",
    desc: "Green means optimal. Orange means acceptable. Red means action needed.",
  },
];

const SUPPORT_LINKS = [
  {
    label: "Report an issue",
    href: "https://github.com/starstack/strapi-plugin-content-optimizer/issues",
    desc: "GitHub Issues",
  },
  {
    label: "View documentation",
    href: "https://github.com/starstack/strapi-plugin-content-optimizer#readme",
    desc: "README on GitHub",
  },
  {
    label: "Starstack",
    href: "https://starstacktech.com",
    desc: "starstacktech.com",
  },
];

const SectionHeader = ({ label }) => (
  <Box marginBottom={4}>
    <Typography
      variant="sigma"
      textColor="neutral500"
      style={{
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontSize: 11,
      }}
    >
      {label}
    </Typography>
  </Box>
);

const ThresholdTable = ({ field, rows }) => (
  <Box marginBottom={6}>
    <Typography
      variant="delta"
      fontWeight="semiBold"
      textColor="neutral700"
      marginBottom={3}
    >
      {field}
    </Typography>
    <Box
      style={{
        border: "1px solid #eaeaef",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {rows.map((row, i) => (
        <Flex
          key={i}
          justifyContent="space-between"
          alignItems="center"
          style={{
            padding: "10px 16px",
            background: i % 2 === 0 ? "#ffffff" : "#fafafa",
            borderBottom: i < rows.length - 1 ? "1px solid #eaeaef" : "none",
          }}
        >
          <Typography
            variant="pi"
            textColor="neutral600"
            style={{ fontFamily: "monospace", width: 120, flexShrink: 0 }}
          >
            {row.range}
          </Typography>
          <Box
            style={{
              background: row.color + "18",
              border: `1px solid ${row.color}40`,
              borderRadius: 4,
              padding: "2px 10px",
              width: 72,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="pi"
              fontWeight="semiBold"
              style={{ color: row.color }}
            >
              {row.status}
            </Typography>
          </Box>
        </Flex>
      ))}
    </Box>
  </Box>
);

export const HomePage = () => {
  return (
    <Layouts.Root>
      <Page.Title>Content Optimizer</Page.Title>
      <Layouts.Content>
        <Box
          paddingLeft={10}
          paddingRight={10}
          paddingTop={8}
          paddingBottom={10}
        >
          <Box marginBottom={8}>
            <Flex alignItems="center" gap={3} marginBottom={2}>
              <Typography
                variant="alpha"
                fontWeight="bold"
                textColor="neutral800"
              >
                Content Optimizer
              </Typography>
              <Box
                style={{
                  background: "#eafbea",
                  border: "1px solid #67ae6e",
                  borderRadius: 20,
                  padding: "2px 10px",
                }}
              >
                <Typography
                  variant="pi"
                  fontWeight="semiBold"
                  style={{ color: "#1d6b3e" }}
                >
                  v1.0.0
                </Typography>
              </Box>
            </Flex>
            <Typography
              variant="omega"
              textColor="neutral500"
              style={{ maxWidth: 520 }}
            >
              Real-time SEO and readability analysis, injected directly into the
              Content Manager edit view. Feedback updates live as you type - no
              page reload required.
            </Typography>
          </Box>

          <Flex gap={8} alignItems="flex-start">
            <Box style={{ flex: 1 }}>
              <Box
                padding={6}
                marginBottom={6}
                style={{
                  border: "1px solid #eaeaef",
                  borderRadius: 8,
                  background: "#ffffff",
                }}
              >
                <SectionHeader label="How It Works" />
                <Flex direction="column" gap={0} style={{ width: "100%" }}>
                  {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
                    <Box key={step} style={{ width: "100%" }}>
                      <Flex
                        gap={4}
                        alignItems="flex-start"
                        paddingTop={3}
                        paddingBottom={3}
                        style={{ width: "100%", justifyContent: "flex-start" }}
                      >
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            minWidth: 32,
                            borderRadius: "50%",
                            background: "#f0f0ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            variant="pi"
                            fontWeight="bold"
                            style={{ color: "#4945ff" }}
                          >
                            {step}
                          </Typography>
                        </Box>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="omega"
                            fontWeight="semiBold"
                            textColor="neutral800"
                            style={{ display: "block" }}
                          >
                            {title}
                          </Typography>
                          <Typography
                            variant="pi"
                            textColor="neutral500"
                            style={{ display: "block", marginTop: 2 }}
                          >
                            {desc}
                          </Typography>
                        </Box>
                      </Flex>
                      {i < HOW_IT_WORKS.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Flex>
              </Box>

              <Box
                padding={6}
                style={{
                  border: "1px solid #eaeaef",
                  borderRadius: 8,
                  background: "#ffffff",
                }}
              >
                <SectionHeader label="Status Thresholds" />
                {THRESHOLDS.map((t) => (
                  <ThresholdTable key={t.field} field={t.field} rows={t.rows} />
                ))}

                <Typography
                  variant="delta"
                  fontWeight="semiBold"
                  textColor="neutral700"
                  marginBottom={3}
                >
                  Content
                </Typography>
                <Box
                  style={{
                    border: "1px solid #eaeaef",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  {CONTENT_RULES.map((row, i) => (
                    <Flex
                      key={i}
                      justifyContent="space-between"
                      alignItems="center"
                      style={{
                        padding: "10px 16px",
                        background: i % 2 === 0 ? "#ffffff" : "#fafafa",
                        borderBottom:
                          i < CONTENT_RULES.length - 1
                            ? "1px solid #eaeaef"
                            : "none",
                      }}
                    >
                      <Typography
                        variant="pi"
                        textColor="neutral600"
                        style={{
                          fontFamily: "monospace",
                          width: 160,
                          flexShrink: 0,
                        }}
                      >
                        {row.condition}
                      </Typography>
                      <Typography
                        variant="pi"
                        fontWeight="semiBold"
                        style={{ color: row.color }}
                      >
                        {row.severity}
                      </Typography>
                    </Flex>
                  ))}
                </Box>
              </Box>
            </Box>

            <Box style={{ width: 280, flexShrink: 0 }}>
              <Box
                padding={6}
                style={{
                  border: "1px solid #eaeaef",
                  borderRadius: 8,
                  background: "#ffffff",
                }}
              >
                <SectionHeader label="Support & Resources" />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {SUPPORT_LINKS.map(({ label, href, desc }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        display: "block",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "#f6f6f9",
                          borderRadius: 6,
                          border: "1px solid #eaeaef",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <Typography
                          variant="omega"
                          fontWeight="semiBold"
                          style={{ color: "#4945ff", display: "block" }}
                        >
                          {label} →
                        </Typography>
                        <Typography
                          variant="pi"
                          textColor="neutral400"
                          style={{ display: "block", marginTop: 2 }}
                        >
                          {desc}
                        </Typography>
                      </div>
                    </a>
                  ))}
                </div>
              </Box>
            </Box>
          </Flex>
        </Box>
      </Layouts.Content>
    </Layouts.Root>
  );
};
