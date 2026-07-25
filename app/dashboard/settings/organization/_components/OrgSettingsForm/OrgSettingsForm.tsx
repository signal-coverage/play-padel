"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { updateOrganizationSettings } from "@/app/actions/organizations";
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from "@/core/organizations/schemas/organization.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_FORM_VALUES, CURRENCIES } from "./consts";
import type { OrgSettingsFormProps } from "./types";

export function OrgSettingsForm({ readOnly = false }: OrgSettingsFormProps) {
  const { organization, refetch } = useOrganization();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (organization) {
      reset({
        name: organization.name,
        email: organization.email,
        phone: organization.phone ?? "",
        currency: organization.currency,
        legalName: organization.legalName ?? "",
        taxId: organization.taxId ?? "",
      });
    }
  }, [organization, reset]);

  const currency = watch("currency");

  async function onSubmit(data: UpdateOrganizationInput) {
    const result = await updateOrganizationSettings(data);
    if (result.success) {
      toast.success("Settings saved");
      refetch();
    } else {
      toast.error(result.error ?? "Failed to save settings");
    }
  }

  if (!organization) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <Card>
        <CardHeader>
          <CardTitle>General information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              {readOnly ? (
                <p className="text-sm font-medium py-1">{organization.name}</p>
              ) : (
                <>
                  <Input id="name" {...register("name")} />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {readOnly ? (
                <p className="text-sm font-medium py-1">{organization.email}</p>
              ) : (
                <>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              {readOnly ? (
                <p className="text-sm font-medium py-1">
                  {organization.phone ?? "—"}
                </p>
              ) : (
                <Input id="phone" {...register("phone")} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Legal name</Label>
              {readOnly ? (
                <p className="text-sm font-medium py-1">
                  {organization.legalName ?? "—"}
                </p>
              ) : (
                <Input id="legalName" {...register("legalName")} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              {readOnly ? (
                <p className="text-sm font-medium py-1">
                  {organization.taxId ?? "—"}
                </p>
              ) : (
                <Input id="taxId" {...register("taxId")} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              {readOnly ? (
                <p className="text-sm font-medium py-1">
                  {organization.currency}
                </p>
              ) : (
                <>
                  <Select
                    value={currency}
                    onValueChange={(v) => setValue("currency", v)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currency && (
                    <p className="text-sm text-destructive">
                      {errors.currency.message}
                    </p>
                  )}
                </>
              )}
            </div>

            {!readOnly && (
              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
