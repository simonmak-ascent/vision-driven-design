# Human Factors Domain Primer

Loaded during Phase 2 (Strategy) when the vision involves user behavior change, adoption, or psychology-driven outcomes.

## Research Patterns

### Behavioral Economics & Motivation
- **What motivates the user to change behavior?** Apply Fogg Behavior Model: Behavior = Motivation + Ability + Prompt. Which is missing today?
- **What are the current habits?** Map the cue → routine → reward loop the user follows today. Where does VDD's product interrupt or replace this loop?
- **What are the switching costs?** Loss aversion (fear of losing existing data/workflows), cognitive switching cost (learning a new tool), social switching cost (everyone else uses the old tool).
- **What is the "job to be done"?** Apply Christensen's JTBD framework: what progress is the user trying to make in their life? What do they "hire" the current solution to do? What do they "fire" it for?

### Cognitive Load & Usability
- **Hick's Law**: Decision time increases logarithmically with number of choices. Every feature added to a UI increases cognitive load. VDD's Spec phase should require a justification for every UI element beyond the 5 essential ones.
- **Miller's Law**: Humans hold ~7 items in working memory. Break complex workflows into chunks of ≤7 steps. Validate in spec ACs.
- **Jakob's Law**: Users spend most of their time on *other* sites. Design patterns should follow conventions users already know. Innovation increases cognitive load — justify it with impact trace.
- **Cognitive walkthrough**: For each user story, walk through the interface from the user's perspective: "Will the user know what to do? Will they see the control? Will they understand the feedback?"

### Habit Formation & Retention
- **Hook Model** (Nir Eyal): Trigger → Action → Variable Reward → Investment. Does the product have an external trigger (notification, email)? An internal trigger (boredom, need to organize)? A variable reward (unpredictable positive outcome)?
- **The 7-day cliff**: Most user drop-off happens between day 1 and day 7. What happens on day 8 that brings the user back? Design retention hooks before launch.
- **The IKEA effect**: Users value products they've invested effort in. Does the onboarding include a small investment (customization, data import, profile setup) that increases perceived value?

### Accessibility & Inclusive Design
- **WCAG 2.2 AA** is the minimum. Beyond compliance: cognitive accessibility for users with ADHD, dyslexia, or executive function challenges.
- **Low-literacy design**: If the vision targets underserved communities, 50%+ of users may read at a 6th-grade level. Icons, voice input, and visual feedback reduce reliance on text.
- **Motor accessibility**: Test touch targets (min 44x44px), keyboard navigation, and switch-device compatibility.

## Impact Verification

### Behavioral Metrics
- **Activation rate**: % of users who complete the key behavior within first session (e.g., create first task, make first purchase)
- **Habit formation rate**: % of users who return and perform the key behavior 3+ times in the first week
- **Task completion rate**: % of initiated workflows that reach completion
- **Time-to-value**: minutes from first interaction to experiencing the core value proposition

### Psychology-to-Vision Trace

For each vision impact, identify the psychological mechanism:
- "Users adopt digital tool over paper" → Activation energy reduction (make digital easier than paper)
- "Users complete more tasks" → Variable reward (checking off tasks feels satisfying) + commitment device (public list creates accountability)
- "Users return daily" → Habit loop (trigger: daily planning moment, action: open app, reward: clear organized view)

### Domain-Specific Constraints

- **Informed consent**: If collecting behavioral data for impact measurement, users must opt in with clear explanation
- **No dark patterns**: Banned patterns include: confirm-shaming ("No thanks, I don't want to save money"), disguised ads, forced continuity, friend spam
- **Attention respect**: No infinite scroll that exploits variable reward psychology without user value. Every engagement mechanism must trace to a vision impact.

## Integration with VDD

- **Vision phase**: Human-factors primer adds "Behavioral Goal" and "Psychological Mechanism" sections to vision.md §4 (5Ws — actors and impacts)
- **Strategy phase**: Market Agent uses human-factors patterns to analyze user motivation and switching costs
- **Specs phase**: ACs include behavioral ACs ("Given a first-time user, when they complete onboarding, then they have created at least 1 task within 5 minutes")
- **Validate phase**: Impact verification includes behavioral metrics alongside technical metrics

## Anti-Patterns Specific to Human Factors

- Designing for yourself (the builder) instead of the user
- Adding features because they're "cool" — every feature must trace to a behavioral impact
- Measuring vanity metrics (page views) over behavioral change metrics (task completion)
- Ignoring cognitive accessibility because "our users are technical"
- Using dark patterns that generate short-term metrics at the cost of long-term trust
