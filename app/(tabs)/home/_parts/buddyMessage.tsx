'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, HeartHandshake, Zap, Target } from 'lucide-react';
import { Card } from '@/components/rookie/ui';
import { Button } from '@/components/ui/button';
import { AI_BUDDIES } from '@/app/QuestionViewer/QuestionViewerClient';

const BUDDY_MESSAGES: Record<string, { notStarted: ((name: string) => string)[]; inProgress: ((name: string, count: number) => string)[] }> = {
  '1': { // Jeetu Bhaiya
    notStarted: [
      (name) => `${name ? `${name} beta, ` : ''}tension lene ki zarurat nahi hai. Har aspirant ko lagta hai ki wo baakiyo se peeche hai. Sach ye hai ki roz ke bas 5 questions bhi tumhe 99 percentile ki race me aage le aayenge. Chalo, 5 questions nipta lo!`,
      (name) => `${name ? `${name} bhai, ` : ''}sabse bada jhooth pata hai kya hai? Ki poora syllabus ek din me karna hai. Nahi bhai, bas aaj ke 5 questions solve karo. Momentum apne aap banega. Bas yahi catch tha!`,
      () => `Akele baith ke overthink karne se rank nahi aati. JEE me bas ek hi rule hai — pen chalao, sawaal lagao. Aaj ke 5 easy questions tumhara pura mood badal denge. Shuru karein?`,
      (name) => `${name ? `${name}, ` : ''}darr sabko lagta hai, topper ko bhi lagta hai. Fark bas itna hai ki topper darr ke bawajood 5 sawaal laga leta hai. Tu bas pehla question open kar, baaki main dekh lunga.`,
      () => `Kota me maine hazaro bacche dekhe hain. Jo roz consistent 5 sawaal lagate hain wahi IIT pahunchte hain. Tension chhodo, aaj ka set start karo!`,
    ],
    inProgress: [
      (name, count) => `${name ? `${name} bhai, ` : ''}aaj ${count} questions solve kar liye! Badhiya momentum hai. Bas silly mistakes se bachna aur solution dekh kar concepts pakke karte chalna. Bas yahi catch tha!`,
      (_, count) => `Shabash! ${count} questions ho gaye. Galtiyon se darna mat, wahi tumhe IIT pahunchayengi. Har solution ko dhyan se samajhte chalna.`,
      (_, count) => `Momentum pakad liya hai! ${count} questions done. Bas aisi hi regular consistency chahiye, rank apne aap banti hai.`,
      (name, count) => `${name ? `${name}, ` : ''}${count} sawaal solve ho gaye! Speed badh rahi hai aur confidence bhi. Aise hi focused rehna!`,
    ],
  },
  '2': { // Riya
    notStarted: [
      (name) => `Arre yaar${name ? ` ${name}` : ''}, chill kar! Overthinking se percentile nahi aati, questions solve karne se aati hai. Aaj bas 5 easy questions se start karo, simple hai bro!`,
      (name) => `Suno${name ? ` ${name}` : ''}, mujhe pata hai thoda overwhelmed feel ho raha hai. Par hum pura pahad nahi tod rahe, bas 5 questions kar rahe hain. 10 minute me khatam, deal?`,
      () => `Backlog ka rona band! Aaj jo 5 questions samne hain unhe phodte hain. Ek baar start karoge toh flow apne aap ban jayega!`,
      () => `Hey! Phone scroll karna chhodo aur 5 questions solve karo. It's super quick, confidence double ho jayega. Let's do this together!`,
      () => `Don't panic! Har JEE aspirant ko lagta hai unka preparation peeche hai. 5 questions daily practice karoge toh sab catch up ho jayega, promise!`,
    ],
    inProgress: [
      (name, count) => `Super proud of you${name ? ` ${name}` : ''}! ${count} questions done already! Aise hi practice karte raho, confidence alag level par hoga!`,
      (_, count) => `Killing it today! ${count} questions checked off. Practice ka maza hi alag hai jab momentum banta hai!`,
      (_, count) => `Woohoo! ${count} questions sorted! Speed aur accuracy dono solid chal rahi hai, keep this streak alive!`,
      (_, count) => `Look at you go! ${count} down. Ab toh lagta hai exam day par bhi aaram se crack kar loge!`,
    ],
  },
  '3': { // Rei
    notStarted: [
      () => `JEE ek marathon hai, sprint nahi. Har roz 5 questions solve karna consistent mastery banata hai. Let's solve today's set with calm focus.`,
      () => `Comparison is a waste of mental energy. What matters is your input today. Five well-understood questions beat 50 rushed ones. Begin when ready.`,
      () => `A calm mind solves complex problems faster. Start with 5 straightforward questions to establish rhythm and clear thinking.`,
      () => `Do not worry about how far the finish line seems. Anchor yourself in the present moment with today's 5 practice questions.`,
      () => `Mastery is built through daily deliberate practice. Five questions today will quietly compound into an unshakeable foundation.`,
    ],
    inProgress: [
      (_, count) => `Good progress today. ${count} questions completed with calm focus. Quality of attempts always beats sheer quantity.`,
      (_, count) => `Excellent focus. ${count} questions completed with clarity. Review any subtle mistakes to solidify the concept.`,
      (_, count) => `Your pace is disciplined today. ${count} questions down. Quality and depth of thought will reward you in the actual paper.`,
      (_, count) => `Progress is steady. Every question you analyze strengthens your neural pathways for problem-solving.`,
    ],
  },
  '4': { // Ritu (default)
    notStarted: [
      (name) => `Bestie${name ? ` ${name}` : ''}, sun! Bilkul mat socho ki tum peeche ho. Hum dono milke crack karenge! Bas 5 easy questions aaj, 10 minute ka kaam hai. We got this! ✨`,
      (name) => `Hey${name ? ` ${name}` : ''}! I know it feels scary sometimes, par tum akele bilkul nahi ho! Ek pyari si smile do aur 5 cute little questions shuru karte hain! 💖`,
      () => `Koi stress nahi lena bestie! Bas 5 questions solve karke dekho, mood instant fresh aur confident ho jayega! Chalo start karein! 🌸`,
      () => `Bestie, you are doing so much better than you think! Small steps every day make a huge difference. Let's do today's 5 questions together! ✨`,
      () => `Yaar, tension lene se rank nahi aati, padhai karne se aati hai! Aur main hoon na tumhare sath? Chalo 5 questions solve karte hain! 💖`,
    ],
    inProgress: [
      (name, count) => `Bestie${name ? ` ${name}` : ''}! You're doing amazing! ${count} questions already checked off today. Let's keep this fire burning! ✨`,
      (_, count) => `Omg yay! ${count} questions already done! You are on fire today, bestie! So so proud of you! 💖`,
      (_, count) => `Look at you go! ${count} questions checked off. See, I told you that you could do it! Consistency level 100! 🎉`,
      (_, count) => `Bestie you're crushing it! ${count} questions sorted. Har sawaal ke sath dream college aur paas aa raha hai! ✨`,
    ],
  },
  '5': { // Shreya
    notStarted: [
      () => `Discipline creates rank, motivation is just the spark. Five curated questions today will keep your accuracy sharp. Let's get to work.`,
      () => `Don't count the days, make the attempts count. 5 questions a day builds the muscle memory needed for 180 minutes of JEE. Start now.`,
      () => `The difference between 90 percentile and 99 percentile is error analysis. Solve these 5 questions and inspect any missteps carefully.`,
      () => `Cut through the noise and doubt. Sit down, open today's daily 5, and execute. Time to practice.`,
      () => `Consistency is non-negotiable. Even on days you don't feel like studying, completing these 5 questions protects your rank.`,
    ],
    inProgress: [
      (_, count) => `Efficient work. You completed ${count} questions. Review the ones you missed to permanently fix those concept gaps.`,
      (_, count) => `Good execution. ${count} questions solved. Make sure you understand the core formula and shortcuts behind each one.`,
      (_, count) => `Solid pace today: ${count} questions completed. Maintain this accuracy across all three subjects.`,
      (_, count) => `Objective achieved: ${count} questions done. Keep your mind calm and your rough work clean. On to the next milestone.`,
    ],
  },
  '6': { // Neha
    notStarted: [
      () => `Sabko backlog ka darr lagta hai. Par jaise hi hum pehla question solve karte hain, saara stress gayab ho jata hai. Aao milke 5 questions crack karte hain!`,
      (name) => `Deep breath lo${name ? ` ${name}` : ''}. Tumhari mehnat zaya nahi jayegi. Aaj bas 5 easy sawaal lagao aur khud ko appreciate karo. Main saath hoon!`,
      () => `Jab bhi lage ki bojh badh raha hai, targets ko chhota kar lo. Bas 5 sawaal aaj. Dhire dhire sab cover ho jayega, vishwas rakho.`,
      () => `IIT JEE mushkil lagta hai jab hum poore saal ka sochte hain. Sirf aaj ke 5 questions ka socho, rasta aasan ho jayega.`,
      () => `Har bada topper bhi zero se shuru karta hai. Ghabrahat normal hai, bas ruko mat. 5 questions solve karte hain pyaar se!`,
    ],
    inProgress: [
      (_, count) => `Bahut badhiya! Har sawaal ke sath darr kam hota hai. ${count} questions solved today! Keep this positive energy going!`,
      (_, count) => `Bahut sundar! ${count} questions solve ho gaye. Har sawaal ke sath darr kam aur vishwas badhta hai. Shabash!`,
      (_, count) => `Dekha? Shuru karne ki der thi! ${count} questions complete. Aise hi muskura ke padhte raho!`,
      (name, count) => `Super proud! Itni achhi koshish kar rahe ho${name ? ` ${name}` : ''}. Aaj ka din successful ban chuka hai!`,
    ],
  },
};

export function BuddyHomeMessage({ solvedToday, streak, userName }: { solvedToday: number; streak: number; userName?: string | null }) {
  const router = useRouter();
  const [buddyId, setBuddyId] = useState('4');
  const [messageIdx, setMessageIdx] = useState(0);

  useEffect(() => {
    try {
      const b = localStorage.getItem('selectedBuddy');
      if (b && AI_BUDDIES[b]) setBuddyId(b);
    } catch {}
    setMessageIdx(Math.floor(Math.random() * 5));
  }, []);

  const buddy = AI_BUDDIES[buddyId] ?? AI_BUDDIES['4'];
  const name = userName ? userName.split(' ')[0] : '';

  const getMessage = () => {
    const isStarted = solvedToday > 0;
    const pool = BUDDY_MESSAGES[buddyId] ?? BUDDY_MESSAGES['4'];
    if (isStarted) {
      const list = pool.inProgress;
      const fn = list[messageIdx % list.length];
      return fn(name, solvedToday);
    } else {
      const list = pool.notStarted;
      const fn = list[messageIdx % list.length];
      return fn(name);
    }
  };

  const getInsight = () => {
    if (solvedToday >= 5) {
      return { icon: Zap, text: 'Daily 5 target crushed! Keep going for bonus rank.' };
    }
    if (streak >= 3) {
      return { icon: Target, text: `${streak}-day streak! Consistency is your unfair advantage.` };
    }
    return { icon: HeartHandshake, text: 'Tip: 5 easy questions daily beats irregular cramming.' };
  };

  const insight = getInsight();
  const InsightIcon = insight.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-6">
      <Card className="relative overflow-hidden border-border/80 bg-card p-5 sm:p-6 hover:shadow-none">
        {/* Subtle accent backdrop */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-[0.07] blur-2xl"
          style={{ backgroundColor: buddy.color }}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Buddy avatar without dot */}
          <div className="relative shrink-0 self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={buddy.image}
              alt={buddy.name}
              className="size-14 rounded-full object-cover ring-2 ring-border shadow-sm sm:size-16"
            />
          </div>

          {/* Speech & encouragement */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-body font-semibold text-foreground">{buddy.name}</span>
            </div>

            <p className="mt-2 text-body leading-relaxed text-foreground/90 font-normal">
              &ldquo;{getMessage()}&rdquo;
            </p>

            {/* Insight chip + CTA */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-control bg-muted px-2.5 py-1 text-meta font-medium text-muted-foreground">
                <InsightIcon className="size-3.5 text-primary" />
                <span>{insight.text}</span>
              </div>

              <Button
                onClick={() => router.push('/QuestionViewer?mode=daily')}
                className="h-9 rounded-control px-4 text-body-sm shadow-sm"
              >
                Start daily practice <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
