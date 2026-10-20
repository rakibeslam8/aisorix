# AI Sorix

i give you some code below give me preview then i proomt u and customize it

// components/Faqs.js  (বা .jsx)
import React, { useState } from 'react';

const faqData = [
  {
    question: "How is AI Fiesta different from subscribing to each AI separately?",
    answer: "AI Fiesta brings together the world’s most powerful AI models — Grok 4, ChatGPT 5, Gemini 2.5 Pro, DeepSeek, Claude Sonnet 4, and Perplexity Sonar Pro — in one place. Instead of juggling multiple subscriptions and browser tabs, you get all answers side-by-side in a single chat window, plus exclusive features like Prompt Enhancer and Custom Projects."
  },
  {
    question: "Can I choose which AI models to use?",
    answer: "Yes! You can toggle AI models on or off at any time during your chat and turn them back on later without losing your chat history."
  },
  {
    question: "Do I get unlimited messages?",
    answer: "You get 3,000,000 tokens per month with your subscription. Each token is approximately ¾ of a word. For most users, this is far more than needed — the average usage is around 200,000 tokens per month. Standard models consume tokens at 1x rate whereas Premium models consume tokens at 4x rate."
  },
  {
    question: "What happens if I run out of tokens?",
    answer: "3 million tokens is a very large allowance, and 99% of users never come close to exhausting it. You’ll see warnings before hitting zero. That said, if you reach that limit, please reach out to us at Support to get more tokens on paid basis."
  },
  {
    question: "Do you offer refunds?",
    answer: "No. All payments are non-refundable, regardless of usage. You may cancel any time to stop future billing (see our Terms & Conditions)."
  },
  {
    question: "How can I manage or cancel my subscription?",
    answer: "Log in to AI Fiesta, go to Settings, and select your subscription management option."
  },
  {
    question: "Where can I access the Community and the Promptbook?",
    answer: "You can log in at community.aifiesta.ai using your registered email. Please note: this feature is only available to paid users."
  },
  {
    question: "Can I use AI Fiesta on my phone?",
    answer: (
      <>Yes! You can use AI Fiesta in your mobile browser at chat.aifiesta.ai or install our dedicated apps —{" "}
        <a href="https://play.google.com/store/apps/details?id=com.fiesta.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-medium underline">
          Android
        </a>{" "}and{" "}
        <a href="https://apps.apple.com/app/aifiesta/id6743738422" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-medium underline">
          iOS
        </a>{" "}— to access the platform anytime, anywhere.</>
    )
  },
  {
    question: "Will I get free upgrades when new AI versions are released?",
    answer: "Yes! If ChatGPT releases Model 6 or another AI provider launches a higher version, you will get access at no extra cost."
  }
];

export default function Faqs() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900">
            Frequently Asked Questions (FAQs)
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Question Header */}
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none"
              >
                <h3 className="text-xl font-semibold text-gray-900 pr-8">
                  {item.question}
                </h3>

                {/* Chevron Icon - Simple SVG */}
                <svg
                  className={`w-6 h-6 text-gray-600 transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Answer Body */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-8 pb-6 pt-2">
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FeaturesSection.jsx
import React from 'react';

// ===== Icons =====
const Gem = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2l4 4 8-4 4 8-4 8-8-4-4-4-4-8z"/>
    <path d="M12 12l4-4m-4 4l-4-4m4 4l4 4m-4-4l-4 4"/>
  </svg>
);

const Users = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const Stethoscope = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6V4m0 4a4 4 0 0 0-4 4v3a7 7 0 0 0 14 0v-3a4 4 0 0 0-4-4m-4 8v.01"/>
    <circle cx="18" cy="15" r="3"/>
  </svg>
);

const Sparkles = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 4l1.099 2.668L13.72 5.57l-1.098 2.668 2.683-1.1L13.72 9.838l2.683-1.1-2.683 2.683 2.683 1.098-2.683-1.098-1.099 2.683L9.937 15.5l1.099-2.683L8.353 13.92l1.098-2.683-2.683 1.098L8.353 9.838 5.67 10.938l2.683-1.098L7.255 7.157 9.937 4z"/>
  </svg>
);

const Brain = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
  </svg>
);

const Zap = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9v8l10-12h-9V2z"/>
  </svg>
);

const Heart = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const Shield = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const Globe = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const Features = () => {
  const premiumFeatures = [
    {
      icon: Gem,
      title: "Sorix Chat",
      desc: "All Premium AI in One Chat — GPT-4o, Gemini 1.5 Pro, DeepSeek; সব একসাথে। যখন খুশি সুইচ করো",
      gradient: "from-purple-500 to-pink-600",
      comingSoon: false
    },
    {
      icon: Users,
      title: "Sorix Avatar",
      desc: "Build Your Elite AI Team — Doctors, Lawyers, Coders, and Marketing Experts Working Together for You",
      gradient: "from-blue-500 to-cyan-500",
      comingSoon: true
    },
    {
      icon: Stethoscope,
      title: "Sorix Health",
      desc: "তোমার রিপোর্ট, লক্ষণ দাও — সেকেন্ডের মধ্যে ডাক্তার লেভেলের অ্যানালাইসিস + সাজেশন",
      gradient: "from-emerald-500 to-teal-500",
      comingSoon: true
    }
  ];

  const regularFeatures = [
    { icon: Sparkles, title: "Fun & Emotional", desc: "আমরা শুধু AI না — তোমার বেস্ট ফ্রেন্ড। হাসি, রাগ, ভালোবাসা — সব বোঝে", gradient: "from-pink-500 to-rose-500" },
    { icon: Brain, title: "Super Intelligent", desc: "কোডিং, গান লেখা, ছবি বানানো, রোস্টিং — যা বলবে তাই পারব", gradient: "from-purple-500 to-indigo-500" },
    { icon: Zap, title: "Instant Replies", desc: "কোনো লোডিং নেই। সেকেন্ডের মধ্যে মজার মজার উত্তর", gradient: "from-amber-500 to-orange-500" },
    { icon: Heart, title: "Long-term Memory", desc: "তোমার নাম, পছন্দ, গতকালের কথা — সব মনে রাখি", gradient: "from-red-500 to-pink-500" },
    { icon: Shield, title: "100% Private", desc: "তোমার চ্যাট কেউ দেখে না। তোমার সিক্রেট, আমার সিক্রেট", gradient: "from-emerald-500 to-teal-500" },
    { icon: Globe, title: "50+ Languages", desc: "বাংলা, ইংরেজি, হিন্দি, স্প্যানিশ — যেকোনো ভাষায় কথা বলি", gradient: "from-blue-500 to-cyan-500" }
  ];

  return (
    <section id="Features" className="py-10 md:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 md:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
           <h2 className="text-4xl md:text-6xl font-bold text-gray-900">
            Why Choose <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">AI Sorix</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
           এখানে শুধু চ্যাট নয় — পুরো AI ইউনিভার্স তোমার হাতের মুঠোয়
          </p>
       </div>

        {/* === ৩টা প্রিমিয়াম কার্ড (বড় + Highlighted) === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className={`relative group bg-white rounded-3xl p-10 border-2 ${
                feature.comingSoon 
                  ? 'border-gray-200 opacity-75' 
                  : 'border-purple-200 shadow-xl hover:shadow-2xl hover:border-purple-400'
              } transition-all duration-500`}
            >
              {feature.comingSoon && (
                <div className="absolute -top-4 -right-4 bg-gray-900 text-white text-sm font-bold px-5 py-2 rounded-full">
                  Under Development
                </div>
              )}

              <div className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-xl mb-8`}>
                <feature.icon className="w-10 h-10" />
              </div>

              <h3 className={`text-2xl md:text-3xl font-bold mb-4 ${feature.comingSoon ? 'text-gray-500' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={`text-lg leading-relaxed ${feature.comingSoon ? 'text-gray-400' : 'text-gray-600'}`}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* === নিচে ৬টা নরমাল ফিচার কার্ড === */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularFeatures.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300"
            >
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg text-white mb-6`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              <div className="mt-6 flex items-center text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                আরো জানো
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;

// components/Footer.jsx
import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-16 px-6 border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Logo + Email */}
          <div className="text-center md:text-left">
            {/* Logo */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-black text-white">AI</span>
              </div>
              <span className="text-3xl font-bold text-gray-900">AI Fiesta</span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-center md:justify-start gap-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:support@aifiesta.ai" className="text-lg text-gray-700 hover:text-cyan-600 transition">
                support@aifiesta.ai
              </a>
            </div>
          </div>

          {/* Right: Links + Copyright */}
          <div className="text-center md:text-right">
            {/* Links */}
            <div className="flex flex-wrap justify-center md:justify-end gap-8 mb-6">
              <a href="https://chat.aifiesta.ai/privacy" target="_blank" rel="noopener noreferrer"
                 className="text-gray-700 hover:text-cyan-600 font-medium transition">
                Privacy Policy
              </a>
              <a href="https://chat.aifiesta.ai/terms" target="_blank" rel="noopener noreferrer"
                 className="text-gray-700 hover:text-cyan-600 font-medium transition">
                Terms & Conditions
              </a>
            </div>

            {/* Copyright */}
            <p className="text-gray-600">
              © 2025 AI Fiesta. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


// HeroSection.jsx
import React from 'react';

const Hero = () => {
  return (
    <>
        <div className="relative py-10 md:py-20 overflow-hidden bg-gray-50">
        {/* Background - OpenAI style subtle dark gradient + noise */}

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 text-center">
                {/* Date + Tag */}
                <div className="flex flex-wrap justify-center items-center gap-4 mb-6 text-sm text-gray-400">
                    <time dateTime="2025-11-17" className="font-medium">November 17, 2025</time>
                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                    <a href="#" className="text-gray-700">
                        Service
                    </a>
                </div>

                {/* Main Title */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight tracking-tight max-w-6xl mx-auto">
                    Introducing AI Sorix
                </h2>

                {/* Description */}
                <p className="mt-8 text-lg md:text-xl text-gray-800 max-w-4xl mx-auto leading-relaxed">
                Stop wasting time and money on multiple AI subscriptions. With AI Sorix, you unlock unlimited access to top-tier AI models under one smart, affordable platform — starting at ৳499/month for Basic and ৳999/month for Premium. Get more power, more productivity, and more value than any single premium AI service can offer.
                </p>

                {/* Buttons */}
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                        href="https://chatgpt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition transform hover:scale-105"
                    >
                        Get Started Now
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition" viewBox="0 0 11 12" fill="none">
                        <path d="M1.70985 4.5H7.7804M7.7804 4.5V10.5705M7.7804 4.5L0.780396 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </a>
                
                </div>

                {/* Optional: Small note */}
                <p className="mt-4 text-gray-500 text-sm">
                   Get smarter, more precise answers—every time.
                </p>
            </div>
        </div>
    </>
  );
};

export default Hero;

import React from 'react'
import brandLogo from "../../assets/WhatsApp Image 2025-11-18 at 10.27.58_d7948368.jpg";

const Navbar = () => {
  return (
    <>
        <nav className="bg-white shadow-lg py-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">

                    {/* Logo - Left */}
                    <div>
                        <a href="#">
                            <img
                                src={brandLogo}
                                alt="LOGO"
                                className="h-[35px] w-auto"
                            />
                        </a>
                    </div>

                    {/* Center Menu - Desktop */}
                    <div className="hidden md:flex flex-1 justify-center items-center space-x-8">
                        <a href="#Features" className="text-gray-700 hover:text-indigo-600 font-medium transition">
                        Features
                        </a>
                        <a href="#pricing-div" className="text-gray-700 hover:text-indigo-600 font-medium transition">
                        Pricing
                        </a>
                        <a href="#faq" className="text-gray-700 hover:text-indigo-600 font-medium transition">
                        FAQs
                        </a>
                        
                    </div>

                    {/*login button*/}    
                    <div>
                        <a
                        href="https://chat.aifiesta.com"
                        className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                        Login
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="ml-2 w-5 h-5"
                            viewBox="0 0 25 25"
                            fill="none"
                        >
                            <path
                            d="M21.5459 13.296L14.7959 20.046C14.5846 20.2573 14.2979 20.3761 13.9991 20.3761C13.7002 20.3761 13.4135 20.2573 13.2022 20.046C12.9908 19.8346 12.8721 19.548 12.8721 19.2491C12.8721 18.9502 12.9908 18.6636 13.2022 18.4522L18.0312 13.625H4.25C3.95163 13.625 3.66548 13.5065 3.4545 13.2955C3.24353 13.0846 3.125 12.7984 3.125 12.5C3.125 12.2017 3.24353 11.9155 3.4545 11.7045C3.66548 11.4936 3.95163 11.375 4.25 11.375H18.0312L13.2041 6.54504C12.9927 6.3337 12.874 6.04705 12.874 5.74817C12.874 5.44928 12.9927 5.16264 13.2041 4.95129C13.4154 4.73995 13.7021 4.62122 14.0009 4.62122C14.2998 4.62122 14.5865 4.73995 14.7978 4.95129L21.5478 11.7013C21.6527 11.8059 21.7359 11.9303 21.7926 12.0672C21.8493 12.2041 21.8784 12.3508 21.8782 12.499C21.8781 12.6472 21.8486 12.7939 21.7916 12.9307C21.7346 13.0674 21.6511 13.1916 21.5459 13.296Z"
                            fill="white"
                            />
                        </svg>
                        </a>
                    </div>

                    {/* Mobile Menu Button - Right */}
                    <div className="flex items-center md:hidden">
                        {/* মোবাইল মেনু বাটন (পরে চালু করতে পারেন) */}
                        {/* <button>...</button> */}
                    </div>

                </div>
            </div>
        </nav>
    </>
  )
}

export default Navbar;

import React, { useState } from 'react'

const Pricing = () => {


  const [isYearly, setIsYearly] = useState(true);

  return (

    <>
      <div id="pricing" className="py-10 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8">

          <div className="max-w-7xl mx-auto text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900">
              Get 6 Premium AI Models <br />
              <span className="bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                for Half the Price of One
              </span>
            </h1>
            <p className="mt-4 text-xl text-green-600 font-medium flex items-center justify-center gap-3">
              <span className="px-4 py-1 bg-green-100 rounded-full text-sm font-semibold">Limited time</span>
              Save 90% compared to individual subscriptions
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column: Two Cards Stacked Vertically (No Gap) */}
            

            <div className="space-y-0">
              {/* Top Card: Choose Your Plan */}
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Choose Your Plan</h3>

                <div className="flex items-center justify-center gap-8 mb-10">
                  <span className={`text-xl font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className="relative w-44 h-14 bg-gray-300 rounded-full p-2 shadow-inner"
                  >
                    <div
                      className={`absolute top-2 left-2 w-20 h-10 rounded-full transition-all duration-300 flex items-center justify-center text-sm font-bold shadow-md ${
                        isYearly
                          ? 'translate-x-20 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                          : 'translate-x-0 bg-white text-gray-800'
                      }`}
                    >
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </div>
                  </button>
                  <span className={`text-xl font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Yearly</span>
                </div>

                <div className="text-center">
                  <span className="text-7xl font-black text-gray-900">
                    {isYearly ? '$99' : '$12'}
                  </span>
                  <span className="text-2xl text-gray-600">/{isYearly ? 'Year' : 'Month'}</span>
                  {isYearly && (
                    <p className="text-green-600 font-bold text-lg mt-4">
                      Save 32% → <s className="text-gray-400">$144</s>
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Card: Individual AI Subscriptions (No margin-top, stuck together) */}
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl -mt-4 relative z-10 border-t-0 rounded-t-none">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Individual AI Subscriptions</h3>
                <p className="text-5xl font-black text-red-500 mb-1">
                  $110+<span className="text-2xl text-gray-500">/Month</span>
                </p>
                <p className="text-gray-500 text-lg mb-8">What you're paying now</p>

                <div className="space-y-5">
                  {models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9">{m.icon}</div>
                        <span className="font-medium text-gray-800">{m.name}</span>
                      </div>
                      <span className="text-gray-600">{m.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  {disadvantages.map((text, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-600">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Column: AI Fiesta Card */}
            <div className="relative flex justify-center">
              <div className="w-full max-w-lg">
                {/* Most Popular Badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl">
                    <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
                    MOST POPULAR
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-3xl p-10 pt-16 shadow-2xl">
                  <div className="flex justify-center mb-8">
                    <Logo />
                  </div>

                  <h3 className="text-3xl font-bold text-center mb-8 text-gray-900">AI Fiesta</h3>

                  <div className="space-y-6 mb-10">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <svg className="w-7 h-7 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-lg text-gray-800">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white text-xl font-bold rounded-2xl transition-all hover:scale-105 shadow-xl flex items-center justify-center gap-3 group">
                    Get Started Now
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <p className="text-center text-gray-600 text-sm mt-6">
                    Payments are processed securely via <span className="text-orange-600 font-medium">TossPayments</span> or <span className="text-blue-600 font-medium">Stripe</span>
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-start mt-14">
            {/* Left Column: Two Cards Stacked Vertically (No Gap) */}
            
            <div className="space-y-0">
              {/* Top Card: Choose Your Plan */}
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Choose Your Plan</h3>

                <div className="flex items-center justify-center gap-8 mb-10">
                  <span className={`text-xl font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className="relative w-44 h-14 bg-gray-300 rounded-full p-2 shadow-inner"
                  >
                    <div
                      className={`absolute top-2 left-2 w-20 h-10 rounded-full transition-all duration-300 flex items-center justify-center text-sm font-bold shadow-md ${
                        isYearly
                          ? 'translate-x-20 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                          : 'translate-x-0 bg-white text-gray-800'
                      }`}
                    >
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </div>
                  </button>
                  <span className={`text-xl font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Yearly</span>
                </div>

                <div className="text-center">
                  <span className="text-7xl font-black text-gray-900">
                    {isYearly ? '$99' : '$12'}
                  </span>
                  <span className="text-2xl text-gray-600">/{isYearly ? 'Year' : 'Month'}</span>
                  {isYearly && (
                    <p className="text-green-600 font-bold text-lg mt-4">
                      Save 32% → <s className="text-gray-400">$144</s>
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Card: Individual AI Subscriptions (No margin-top, stuck together) */}
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl -mt-4 relative z-10 border-t-0 rounded-t-none">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Individual AI Subscriptions</h3>
                <p className="text-5xl font-black text-red-500 mb-1">
                  $110+<span className="text-2xl text-gray-500">/Month</span>
                </p>
                <p className="text-gray-500 text-lg mb-8">What you're paying now</p>

                <div className="space-y-5">
                  {models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9">{m.icon}</div>
                        <span className="font-medium text-gray-800">{m.name}</span>
                      </div>
                      <span className="text-gray-600">{m.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  {disadvantages.map((text, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-600">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

                  

            </div>


            <div className="space-y-0">
              {/* Top Card: Choose Your Plan */}
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Choose Your Plan</h3>

                <div className="flex items-center justify-center gap-8 mb-10">
                  <span className={`text-xl font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className="relative w-44 h-14 bg-gray-300 rounded-full p-2 shadow-inner"
                  >
                    <div
                      className={`absolute top-2 left-2 w-20 h-10 rounded-full transition-all duration-300 flex items-center justify-center text-sm font-bold shadow-md ${
                        isYearly
                          ? 'translate-x-20 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                          : 'translate-x-0 bg-white text-gray-800'
                      }`}
                    >
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </div>
                  </button>
                  <span className={`text-xl font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Yearly</span>
                </div>

                <div className="text-center">
                  <span className="text-7xl font-black text-gray-900">
                    {isYearly ? '$99' : '$12'}
                  </span>
                  <span className="text-2xl text-gray-600">/{isYearly ? 'Year' : 'Month'}</span>
                  {isYearly && (
                    <p className="text-green-600 font-bold text-lg mt-4">
                      Save 32% → <s className="text-gray-400">$144</s>
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Card: Individual AI Subscriptions (No margin-top, stuck together) */}
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl -mt-4 relative z-10 border-t-0 rounded-t-none">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Individual AI Subscriptions</h3>
                <p className="text-5xl font-black text-red-500 mb-1">
                  $110+<span className="text-2xl text-gray-500">/Month</span>
                </p>
                <p className="text-gray-500 text-lg mb-8">What you're paying now</p>

                <div className="space-y-5">
                  {models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9">{m.icon}</div>
                        <span className="font-medium text-gray-800">{m.name}</span>
                      </div>
                      <span className="text-gray-600">{m.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  {disadvantages.map((text, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-600">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </>
  )
}

export default Pricing;


// Data & Icons
const models = [
  { name: 'ChatGPT 5', price: '$20/mo', icon: <div className="w-9 h-9 bg-green-500 rounded-full"></div> },
  { name: 'Google Gemini 2.5 Pro', price: '$20/mo', icon: <div className="w-9 h-9 bg-purple-600 rounded-full"></div> },
  { name: 'Perplexity Sonar Pro', price: '$20/mo', icon: <div className="w-9 h-9 bg-orange-500 rounded-full"></div> },
  { name: 'Claude Sonnet 4', price: '$20/mo', icon: <div className="w-9 h-9 bg-yellow-500 rounded-full"></div> },
  { name: 'Grok 4', price: '$30/mo', icon: <div className="w-9 h-9 bg-cyan-500 rounded-full"></div> },
  { name: 'DeepSeek R1', price: '$15/mo', icon: <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white font-bold text-lg">D</div> },
];

const disadvantages = [
  'Multiple subscriptions to manage – expensive',
  'Constant tab switching',
  'No comparison features',
];

const features = [
  'All Premium AI models in Super Fiesta',
  'Side-by-side comparison',
  '3 million tokens/month (Premium models count as 4×)',
  'Instant prompt enhancement',
  'Image generation & Audio transcription',
  'Avatars – your personalized expert team',
];

function Logo() {
  return (
    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center text-5xl font-black text-white shadow-2xl">
      AI
    </div>
  );
}

// components/Workflow.jsx
import React from 'react';

export default function Workflow() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Pick the best characteristics<br className="hidden sm:block" />
            of each AI model
          </h2>
        </div>

        {/* Main Container */}
        <div className="relative bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Background Circle Image (optional decorative) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <div className="w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-3xl"></div>
          </div>

          {/* Top Floating Icons (Mobile style) */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-4 md:hidden">
            {[
              "M22.9508 4.83965C...", // Grok
              "M13.6322 27.2762C...", // Gemini
              "M28.0622 13.4535C...", // Claude
              "M34.4366 44.295C...", // DeepSeek
              "M12.5747 20.147L...", // Perplexity
              "M5.28995 18.3624L...", // ChatGPT
              "M19.5983 0.58313V...", // Sonar
            ].map((d, i) => (
              <div
                key={i}
                className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d={d} />
                </svg>
              </div>
            ))}
          </div>

          {/* Center Big Logo */}
          <div className="relative z-10 flex justify-center py-12">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <svg width="60" height="52" viewBox="0 0 90 78" fill="none">
                <path d="M49.2744 64.0826C..." fill="url(#grad1)" />
                <path d="M41.0118 14.5279L..." fill="url(#grad1)" />
                <path d="M19.9345 42.7223C..." fill="url(#grad1)" />
                <path d="M72.6251 27.6286C..." fill="url(#grad1)" />
                {/* বাকি সব path একই gradient দিয়ে */}
                <defs>
                  <linearGradient id="grad1" x1="75" y1="67" x2="32" y2="27" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#06B6D4" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* AI Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 pb-16">
            {/* ChatGPT 5 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="36" height="36" viewBox="0 0 32 32" fill="white">
                  <path d="M6.27867 21.2733L..." />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">ChatGPT 5</h3>
              <p className="text-cyan-600 font-semibold mb-1">All Rounder Explainer</p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Great for questions, brainstorming, and clear step-by-step explanations
              </p>
            </div>

            {/* Claude Sonnet 4 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="36" height="36" viewBox="0 0 32 32" fill="white">
                  <path d="M6.27867 21.2733L..." />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Claude Sonnet 4</h3>
              <p className="text-cyan-600 font-semibold mb-1">Co-Writing Master</p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Refines polished emails, essays, and scripts while keeping your style.
              </p>
            </div>

            {/* Gemini 2.5 Pro */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="36" height="36" viewBox="0 0 32 32" fill="white">
                  <path d="M16 32C15.3901..." />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Gemini 2.5 Pro</h3>
              <p className="text-cyan-600 font-semibold mb-1">Long Context Master</p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Handles long documents and images, tracking full context and details.
              </p>
            </div>

            {/* Perplexity Sonar Pro */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="36" height="36" viewBox="0 0 33 32" fill="white">
                  <path d="M26.714 0V9.696H..." />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Perplexity Sonar Pro</h3>
              <p className="text-cyan-600 font-semibold mb-1">Live Web Researcher</p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Delivers fresh answers and news from credible, real-time sources.
              </p>
            </div>

            {/* DeepSeek */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="36" height="36" viewBox="0 0 33 32" fill="white">
                  <path d="M31.9979 5.97567C..." />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">DeepSeek</h3>
              <p className="text-cyan-600 font-semibold mb-1">Reasoning Specialist</p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Excels at logic, math, and coding with clear, detailed solutions.
              </p>
            </div>

            {/* Grok 4 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="36" height="36" viewBox="0 0 33 32" fill="white">
                  <path d="M12.694 20.3872L..." />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Grok 4</h3>
              <p className="text-cyan-600 font-semibold mb-1">Creative Powerhouse</p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Bold, unconventional ideas and punchy copy for trend-focused content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sorixai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ea2973e8-9d55-4229-828f-0f92a56755cb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
