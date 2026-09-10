import { useAccountActions, type AccountActionDependencies } from "./useAccountActions";
import { useCategoryActions, type CategoryActionDependencies } from "./useCategoryActions";
import { useTransactionActions, type TransactionActionDependencies } from "./useTransactionActions";

type ActionDependencies = AccountActionDependencies &
	CategoryActionDependencies &
	TransactionActionDependencies;

// Keep the existing interface while each feature owns its action implementation.
export function useMoneyManagerActions(dependencies: ActionDependencies) {
	const transactions = useTransactionActions(dependencies);
	const accounts = useAccountActions(dependencies);
	const categories = useCategoryActions(dependencies);
	return { ...transactions, ...accounts, ...categories };
}
