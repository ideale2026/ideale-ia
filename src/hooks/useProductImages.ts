import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
}

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as ProductImage[];
    },
    enabled: !!productId,
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, file, displayOrder }: { productId: string; file: File; displayOrder: number }) => {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("product_images")
        .insert({ product_id: productId, image_url: urlData.publicUrl, display_order: displayOrder });
      if (insertError) throw insertError;

      // Also update the main product image_url to the first image
      if (displayOrder === 0) {
        await supabase.from("products").update({ image_url: urlData.publicUrl }).eq("id", productId);
      }

      return urlData.publicUrl;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", vars.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_images").delete().eq("id", id);
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReorderProductImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ images, productId }: { images: { id: string; display_order: number }[]; productId: string }) => {
      for (const img of images) {
        const { error } = await supabase
          .from("product_images")
          .update({ display_order: img.display_order })
          .eq("id", img.id);
        if (error) throw error;
      }

      // Update main product image_url to first image
      const first = images.find((i) => i.display_order === 0);
      if (first) {
        const { data } = await supabase
          .from("product_images")
          .select("image_url")
          .eq("id", first.id)
          .maybeSingle();
        if (data) {
          await supabase.from("products").update({ image_url: data.image_url }).eq("id", productId);
        }
      }
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
