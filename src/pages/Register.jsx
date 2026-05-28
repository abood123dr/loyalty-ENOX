import React from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { UserPlus, ArrowLeft, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  return (
    <AuthLayout
      icon={UserPlus}
      title="إنشاء الحسابات مقفل"
      subtitle="مستخدمو المتاجر يتم إنشاؤهم من لوحة السوبر أدمن فقط."
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline ml-1" />
          العودة لتسجيل الدخول
        </Link>
      }
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
        <ShieldCheck className="w-8 h-8 mx-auto text-primary mb-3" />
        <p className="text-sm text-foreground leading-6">
          لحماية المنصة، لا يمكن لأي متجر إنشاء حساب بنفسه. السوبر أدمن ينشئ المتجر،
          يحدد مالك الحساب، ويتحكم في صلاحياته وتصميم بطاقاته.
        </p>
      </div>
      <Button asChild className="w-full h-12 font-medium mt-5">
        <Link to="/login">تسجيل الدخول</Link>
      </Button>
    </AuthLayout>
  );
}
