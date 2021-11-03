import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, ActivityIndicator } from "react-native";
import { HighlightCard } from "../../components/HighlightCard";
import {
  TransactionCard,
  TransactionCardProps,
} from "../../components/TransactionCard";
import {
  Container,
  Header,
  HighlightCards,
  Icon,
  LoadContainer,
  LogoutButton,
  Photo,
  Title,
  TransactionList,
  Transactions,
  User,
  UserGreeting,
  UserInfo,
  UserName,
  UserWrapper,
} from "./styles";

import { useTheme } from "styled-components";
import { useAuth } from "../../hooks/auth";

export interface DataListProps extends TransactionCardProps {
  id: string;
}

interface HighlightProps {
  amount: string;
  lastTransaction: string;
}

interface HighlightData {
  entries: HighlightProps;
  expensive: HighlightProps;
  total: HighlightProps;
}

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [transaction, setTransactions] = useState<DataListProps[]>([]);
  const [highlightData, setHighlightData] = useState<HighlightData>(
    {} as HighlightData
  );

  const { signOut, user } = useAuth();

  const theme = useTheme();

  function formatNumber(value: number) {
    const valueFormatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

    return valueFormatted;
  }

  function getLastTransactionDate(
    collection: DataListProps[],
    type: "positive" | "negative"
  ) {
    const collectionFiltered = collection.filter(
      (transaction) => transaction.type === type
    );

    if (collectionFiltered.length === 0) return 0;

    const lastTransaction = new Date(
      Math.max.apply(
        Math,
        collectionFiltered.map((transaction) =>
          new Date(transaction.date).getTime()
        )
      )
    );

    return `${lastTransaction.getDate()} de ${lastTransaction.toLocaleString(
      "pt-BR",
      { month: "long" }
    )} `;
  }

  async function loadTransactions() {
    try {
      const dataKey = `@gofinances:transactions_user:${user.id}`;

      const storageTransactions = await AsyncStorage.getItem(dataKey);
      const transactions = storageTransactions
        ? JSON.parse(storageTransactions)
        : [];

      let entriesTotal = 0;
      let expensiveTotal = 0;

      const transactionsFormatted: DataListProps[] = transactions.map(
        (transaction: DataListProps) => {
          if (transaction.type === "positive") {
            entriesTotal += Number(transaction.amount);
          } else {
            expensiveTotal += Number(transaction.amount);
          }

          const amount = Number(transaction.amount).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });

          const date = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(transaction.date));

          return {
            id: transaction.id,
            name: transaction.name,
            amount,
            type: transaction.type,
            category: transaction.category,
            date,
          };
        }
      );

      setTransactions(transactionsFormatted);

      const lastTransactionsEntries = getLastTransactionDate(
        transactions,
        "positive"
      );
      const lastTransactionsExpensive = getLastTransactionDate(
        transactions,
        "negative"
      );
      const totalInterval =
        lastTransactionsExpensive === 0
          ? "Não há transações"
          : `01 a ${lastTransactionsExpensive}`;

      const total = entriesTotal - expensiveTotal;

      setHighlightData({
        entries: {
          amount: formatNumber(entriesTotal),
          lastTransaction:
            lastTransactionsEntries === 0
              ? "Nao há transações"
              : `Última entrada dia ${lastTransactionsEntries}`,
        },
        expensive: {
          amount: formatNumber(expensiveTotal),
          lastTransaction:
            lastTransactionsExpensive === 0
              ? "Nao há transações"
              : `Última saída dia ${lastTransactionsExpensive}`,
        },
        total: {
          amount: formatNumber(total),
          lastTransaction: `Última saída dia ${totalInterval}`,
        },
      });

      setIsLoading(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Não foi possível carregar os dados");
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <Container>
      {isLoading ? (
        <LoadContainer>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </LoadContainer>
      ) : (
        <>
          <Header>
            <UserWrapper>
              <UserInfo>
                <Photo source={{ uri: user.photo }} />

                <User>
                  <UserGreeting>Olá,</UserGreeting>
                  <UserName>{user.name}</UserName>
                </User>
              </UserInfo>

              <LogoutButton onPress={signOut}>
                <Icon name="power" />
              </LogoutButton>
            </UserWrapper>
          </Header>
          <HighlightCards>
            <HighlightCard
              title="Entradas"
              amount={highlightData.entries.amount}
              lastTransaction={highlightData.entries.lastTransaction}
              type="up"
            />
            <HighlightCard
              title="Saídas"
              amount={highlightData.expensive.amount}
              lastTransaction={highlightData.expensive.lastTransaction}
              type="down"
            />
            <HighlightCard
              title="Total"
              amount={highlightData.total.amount}
              lastTransaction={highlightData.total.lastTransaction}
              type="total"
            />
          </HighlightCards>

          <Transactions>
            <Title>Listagem</Title>

            <TransactionList
              data={transaction}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TransactionCard data={item} />}
            ></TransactionList>
          </Transactions>
        </>
      )}
    </Container>
  );
}
