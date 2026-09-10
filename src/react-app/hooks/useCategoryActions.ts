import { useState, type FormEvent } from "react";
import { request } from "../api/client";
import type { Category, CategoryDraft } from "../types";
import type { ActionFeedback } from "./actionTypes";
import { errorMessage } from "../utils/errors";
import { categoryNameMaxLength } from "../utils/constants";

export type CategoryActionDependencies = ActionFeedback & {
	refreshCategories: () => Promise<void>;
};

export function useCategoryActions({
	refreshCategories,
	setError,
	setNotice,
}: CategoryActionDependencies) {
	const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({
		name: "",
		type: "expense",
		sequence: "",
	});
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [categorySaving, setSaving] = useState(false);
	const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
	async function saveCategory(
		event: FormEvent<HTMLFormElement>,
		draft: CategoryDraft = categoryDraft,
		editing: Category | null = editingCategory,
	): Promise<boolean> {
		event.preventDefault();
		const name = draft.name.trim();
		if (!name) {
			setError("Category name is required.");
			return false;
		}
		if (name.length > categoryNameMaxLength) {
			setError(`Category name must be ${categoryNameMaxLength} characters or fewer.`);
			return false;
		}
		const sequence = Number(draft.sequence);
		if (editing && (!Number.isInteger(sequence) || sequence < 1)) {
			setError("Display order must be a positive whole number.");
			return false;
		}
		setSaving(true);
		try {
			const wasEditing = Boolean(editing);
			if (editing)
				await request<Category>(`/categories/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify({ name, sequence }),
				});
			else
				await request<Category>("/categories", {
					method: "POST",
					body: JSON.stringify({ name, type: draft.type }),
				});
			setCategoryDraft({ name: "", type: "expense", sequence: "" });
			setEditingCategory(null);
			setError("");
			setNotice(wasEditing ? "Category updated." : "Category added.");
			await refreshCategories();
			return true;
		} catch (reason) {
			setError(errorMessage(reason, "Could not save category."));
			return false;
		} finally {
			setSaving(false);
		}
	}

	async function deleteCategory(category: Category) {
		if (
			!window.confirm(
				`Delete "${category.name}"? Categories used by expenses cannot be deleted.`,
			)
		)
			return;
		setDeletingCategoryId(category.id);
		try {
			await request<void>(`/categories/${category.id}`, { method: "DELETE" });
			setNotice("Category deleted.");
			await refreshCategories();
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete category."));
		} finally {
			setDeletingCategoryId(null);
		}
	}

	return {
		categoryDraft,
		setCategoryDraft,
		editingCategory,
		setEditingCategory,
		categorySaving,
		saveCategory,
		deleteCategory,
		deletingCategoryId,
	};
}
